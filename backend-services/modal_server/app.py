"""
FastAPI server for executing arbitrary Python code via Modal.
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import modal_executor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Parse Modal tokens from .env file
# The .env file has format: token_id = "ak-xxx"
modal_token_id = os.getenv("token_id", "").strip().strip('"')
modal_token_secret = os.getenv("token_secret", "").strip().strip('"')

# Set Modal environment variables with correct names
if modal_token_id:
    os.environ["MODAL_TOKEN_ID"] = modal_token_id
if modal_token_secret:
    os.environ["MODAL_TOKEN_SECRET"] = modal_token_secret

# Create FastAPI app
app = FastAPI(
    title="Modal Code Execution API",
    description="Execute arbitrary Python code in a sandboxed Modal environment",
    version="1.0.0",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class CodeExecutionRequest(BaseModel):
    """Request model for code execution."""
    code: str = Field(..., description="Python code to execute")
    timeout: Optional[int] = Field(
        default=120,
        description="Execution timeout in seconds",
        ge=1,
        le=600,
    )
    
    # NEW optional S3 file handling fields
    input_file_url: Optional[str] = Field(None, description="Presigned GET URL for input file")
    output_file_url: Optional[str] = Field(None, description="Presigned PUT URL for output file") 
    file_type: Optional[str] = Field(None, description="Input file type: csv, xpt, pdf")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "code": "import numpy as np\nprint(np.random.randn(5))",
                "timeout": 30,
            }
        }
    )


class CodeExecutionResponse(BaseModel):
    """Response model for code execution."""
    success: bool = Field(..., description="Whether execution was successful")
    output: Optional[str] = Field(None, description="Standard output from execution")
    error: Optional[str] = Field(None, description="Error message if execution failed")
    execution_time: Optional[float] = Field(None, description="Execution time in seconds")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "output": "[ 0.123  -0.456   0.789  -0.234   0.567]\n",
                "error": None,
                "execution_time": 1.23,
            }
        }
    )


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    modal_connected: bool
    message: str


# API endpoints
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Modal Code Execution API",
        "version": "1.0.0",
        "endpoints": {
            "execute": "/execute",
            "health": "/health",
            "test": "/test",
            "docs": "/docs",
        },
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API and Modal connection health."""
    try:
        # Check if Modal tokens are configured
        modal_configured = bool(
            os.environ.get("MODAL_TOKEN_ID") and os.environ.get("MODAL_TOKEN_SECRET")
        )
        
        if not modal_configured:
            return HealthResponse(
                status="unhealthy",
                modal_connected=False,
                message="Modal tokens not configured",
            )
        
        # Try a simple Modal test
        test_result = modal_executor.test_modal_setup()
        
        if "✅" in test_result:
            return HealthResponse(
                status="healthy",
                modal_connected=True,
                message="API is running and Modal is connected",
            )
        else:
            return HealthResponse(
                status="degraded",
                modal_connected=False,
                message=f"Modal test failed: {test_result}",
            )
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            modal_connected=False,
            message=f"Health check error: {str(e)}",
        )


@app.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """
    Execute Python code in a Modal sandbox.
    
    The code runs in an isolated environment with common data science packages
    pre-installed (pandas, numpy, scipy, matplotlib, seaborn, etc.).
    
    Now supports optional S3 file input/output via presigned URLs:
    - If input_file_url is provided, the file will be downloaded and made available
    - If output_file_url is provided, code can write to 'output_content' variable to upload
    """
    try:
        logger.info(f"Executing code with length {len(request.code)} characters")
        
        # Validate code is not empty
        if not request.code.strip():
            raise HTTPException(
                status_code=400,
                detail="Code cannot be empty",
            )
        
        # Adjust timeout for file operations if needed
        timeout = request.timeout
        if request.input_file_url or request.output_file_url:
            logger.info(f"S3 file handling enabled - Input: {bool(request.input_file_url)}, Output: {bool(request.output_file_url)}")
            # Use longer timeout for file operations
            timeout = max(request.timeout, 300)
            logger.info(f"Using timeout of {timeout} seconds for file operations")
        
        # Execute code via Modal with S3 parameters
        result = modal_executor.run_code(
            code=request.code,
            timeout=timeout,
            input_file_url=request.input_file_url,
            output_file_url=request.output_file_url,
            file_type=request.file_type
        )
        
        logger.info(f"Execution result: success={result['success']}")
        
        # Check if file was uploaded (for response)
        if request.output_file_url and result['success']:
            if "Successfully uploaded to S3" in result.get('output', ''):
                result['output'] += "\n\n✅ Output file uploaded to S3"
        
        return CodeExecutionResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Code execution failed: {str(e)}", exc_info=True)
        return CodeExecutionResponse(
            success=False,
            output="",
            error=f"Server error: {str(e)}",
            execution_time=None,
        )


@app.get("/test")
async def test_modal():
    """Test Modal setup and available packages."""
    try:
        result = modal_executor.test_modal_setup()
        return {
            "status": "success",
            "message": result,
        }
    except Exception as e:
        logger.error(f"Modal test failed: {str(e)}")
        return {
            "status": "error",
            "message": f"Modal test failed: {str(e)}",
        }


# Example usage endpoint
@app.get("/examples")
async def get_examples():
    """Get example code snippets for testing."""
    return {
        "examples": [
            {
                "name": "Hello World",
                "code": "print('Hello from Modal!')",
            },
            {
                "name": "NumPy Array",
                "code": "import numpy as np\narr = np.random.randn(5, 3)\nprint(f'Array shape: {arr.shape}')\nprint(f'Array mean: {arr.mean():.3f}')",
            },
            {
                "name": "Pandas DataFrame",
                "code": "import pandas as pd\nimport numpy as np\n\ndf = pd.DataFrame({\n    'A': np.random.randn(10),\n    'B': np.random.randn(10),\n    'C': np.random.choice(['X', 'Y', 'Z'], 10)\n})\n\nprint('DataFrame info:')\nprint(df.info())\nprint('\\nDataFrame description:')\nprint(df.describe())\nprint('\\nValue counts for C:')\nprint(df['C'].value_counts())",
            },
            {
                "name": "Web Scraping",
                "code": "import requests\nfrom bs4 import BeautifulSoup\n\nresponse = requests.get('https://httpbin.org/html')\nsoup = BeautifulSoup(response.text, 'html.parser')\nprint(f'Title: {soup.find(\"h1\").text if soup.find(\"h1\") else \"No title found\"}')\nprint(f'Number of paragraphs: {len(soup.find_all(\"p\"))}')",
            },
            {
                "name": "Error Example",
                "code": "# This will raise an error\nx = 1 / 0",
            },
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    # Run the server
    # Note: When using reload=True, run with: uvicorn app:app --reload
    # For direct execution without reload:
    uvicorn.run(
        "app:app",  # Use string import for reload compatibility
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable hot reload for development
        log_level="info",
    )
