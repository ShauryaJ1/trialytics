"""
Modal code execution handler for FastAPI server.
Adapted from modal_quick_sandbox.py for server integration.
"""
import modal
import io
import sys
import traceback
from typing import Dict, Any

# Create Modal app
app = modal.App("fastapi-python-sandbox")

# Configure image with common data science packages
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "pandas",
    "numpy",
    "scipy",
    "matplotlib",
    "seaborn",
    "requests",
    "beautifulsoup4",
    "scikit-learn",
    "plotly",
    # NEW packages for file processing:
    "pyreadstat",  # For reading XPT (SAS transport) files
    "PyPDF2",      # PDF processing
    "pdfplumber",  # Advanced PDF text extraction
    "tabulate",    # For formatting table outputs
    "xlsxwriter",  # For writing Excel files as output
)


@app.function(
    image=image,
    timeout=120,  # 2 minutes timeout
    memory=2048,  # 2GB memory
    cpu=2.0,
)
def execute_code(code: str, input_file_url: str = None, output_file_url: str = None, file_type: str = None) -> Dict[str, Any]:
    """
    Execute Python code in a Modal sandbox with optional S3 file handling.
    
    Args:
        code: Python code string to execute
        input_file_url: Optional presigned GET URL for input file
        output_file_url: Optional presigned PUT URL for output file
        file_type: Optional file type hint (csv, xpt, pdf)
    
    Returns:
        Dictionary with success status, output, and error information
    """
    stdout = io.StringIO()
    stderr = io.StringIO()
    
    # Redirect outputs
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = stdout
    sys.stderr = stderr
    
    try:
        # Create a clean namespace for execution with necessary imports
        exec_namespace = {
            '__builtins__': __builtins__,
        }
        
        # Import common libraries that might be needed
        import requests
        import pandas as pd
        import numpy as np
        
        exec_namespace['requests'] = requests
        exec_namespace['pd'] = pd
        exec_namespace['np'] = np
        exec_namespace['io'] = io
        
        # Handle input file if provided
        if input_file_url:
            print(f"📥 Downloading input file from S3...")
            response = requests.get(input_file_url)
            response.raise_for_status()
            file_content = response.content
            print(f"✅ Downloaded {len(file_content):,} bytes")
            
            # Make file content available in namespace
            exec_namespace['file_content'] = file_content
            
            # Load file based on type
            if file_type == "csv":
                df = pd.read_csv(io.BytesIO(file_content))
                exec_namespace['df'] = df
                print(f"📊 Loaded CSV: {df.shape[0]:,} rows, {df.shape[1]} columns")
                print(f"📋 Columns: {list(df.columns)}")
                
            elif file_type == "xpt":
                import pyreadstat
                df, meta = pyreadstat.read_xport(io.BytesIO(file_content))
                exec_namespace['df'] = df
                exec_namespace['meta'] = meta
                print(f"📊 Loaded XPT: {df.shape[0]:,} rows, {df.shape[1]} columns")
                print(f"📋 Columns: {list(df.columns)}")
                
            elif file_type == "pdf":
                import PyPDF2
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                exec_namespace['pdf_reader'] = pdf_reader
                print(f"📄 Loaded PDF: {len(pdf_reader.pages)} pages")
        
        # Execute user code
        print("\n=== Executing User Code ===\n")
        exec(code, exec_namespace)
        
        # Handle output file if provided
        if output_file_url and 'output_content' in exec_namespace:
            print("\n📤 Uploading output file to S3...")
            output_content = exec_namespace['output_content']
            
            # Convert to bytes if needed
            if isinstance(output_content, str):
                output_bytes = output_content.encode('utf-8')
            elif isinstance(output_content, pd.DataFrame):
                output_bytes = output_content.to_csv(index=False).encode('utf-8')
            else:
                output_bytes = output_content
            
            # Upload to S3
            upload_response = requests.put(
                output_file_url,
                data=output_bytes,
                headers={'Content-Type': 'application/octet-stream'}
            )
            upload_response.raise_for_status()
            print(f"✅ Successfully uploaded to S3 ({len(output_bytes):,} bytes)")
        
        # Capture output
        output = stdout.getvalue()
        error = stderr.getvalue()
        
        return {
            "success": True,
            "output": output,
            "error": error if error else None,
            "execution_time": None,
        }
        
    except Exception as e:
        return {
            "success": False,
            "output": stdout.getvalue(),
            "error": f"{type(e).__name__}: {e}\n{traceback.format_exc()}",
            "execution_time": None,
        }
        
    finally:
        # Restore original stdout/stderr
        sys.stdout = old_stdout
        sys.stderr = old_stderr


@app.function(image=image)
def test_packages() -> str:
    """Test that all packages are working correctly."""
    import pandas as pd
    import numpy as np
    import scipy
    import sklearn
    import plotly
    
    versions = []
    versions.append(f"✅ Pandas {pd.__version__}")
    versions.append(f"✅ NumPy {np.__version__}")
    versions.append(f"✅ SciPy {scipy.__version__}")
    versions.append(f"✅ Scikit-learn {sklearn.__version__}")
    versions.append(f"✅ Plotly {plotly.__version__}")
    
    # Quick test
    df = pd.DataFrame(np.random.randn(5, 3), columns=['A', 'B', 'C'])
    versions.append(f"\n📊 Sample DataFrame shape: {df.shape}")
    versions.append(f"📈 Mean values: A={df['A'].mean():.3f}, B={df['B'].mean():.3f}, C={df['C'].mean():.3f}")
    
    return "\n".join(versions)


# Helper function for FastAPI integration
def run_code(code: str, timeout: int = 120, input_file_url: str = None, output_file_url: str = None, file_type: str = None) -> Dict[str, Any]:
    """
    Wrapper function to execute code remotely via Modal with optional S3 file handling.
    This is what the FastAPI app will call.
    
    Args:
        code: Python code to execute
        timeout: Execution timeout in seconds (default 120, max 600)
        input_file_url: Optional presigned GET URL for input file
        output_file_url: Optional presigned PUT URL for output file
        file_type: Optional file type hint (csv, xpt, pdf)
    """
    try:
        # Create dynamic function with specified timeout
        @app.function(
            image=image,
            timeout=min(timeout, 600),  # Cap at 10 minutes
            memory=4096 if timeout > 120 else 2048,  # More memory for longer jobs
            cpu=2.0,
        )
        def execute_dynamic(code_str: str, input_url: str = None, output_url: str = None, f_type: str = None) -> Dict[str, Any]:
            """Dynamic execution function with custom timeout and S3 support."""
            # Call the main execute_code function with all parameters
            return execute_code(code_str, input_url, output_url, f_type)
        
        # Execute remotely on Modal
        with app.run():
            result = execute_dynamic.remote(code, input_file_url, output_file_url, file_type)
        return result
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": f"Modal execution error: {str(e)}",
            "execution_time": None,
        }


def test_modal_setup() -> str:
    """Test Modal setup and package availability."""
    try:
        with app.run():
            result = test_packages.remote()
        return result
    except Exception as e:
        return f"❌ Modal test failed: {str(e)}"
