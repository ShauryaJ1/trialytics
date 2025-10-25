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
)


@app.function(
    image=image,
    timeout=120,  # 2 minutes timeout
    memory=2048,  # 2GB memory
    cpu=2.0,
)
def execute_code(code: str) -> Dict[str, Any]:
    """
    Execute Python code in a Modal sandbox and return the results.
    
    Args:
        code: Python code string to execute
    
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
        # Create a clean namespace for execution
        exec_namespace = {}
        
        # Execute the code
        exec(code, exec_namespace)
        
        # Capture output
        output = stdout.getvalue()
        error = stderr.getvalue()
        
        return {
            "success": True,
            "output": output,
            "error": error if error else None,
            "execution_time": None,  # Could add timing if needed
        }
        
    except SyntaxError as e:
        return {
            "success": False,
            "output": stdout.getvalue(),
            "error": f"Syntax Error: {e}\n{traceback.format_exc()}",
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
def run_code(code: str) -> Dict[str, Any]:
    """
    Wrapper function to execute code remotely via Modal.
    This is what the FastAPI app will call.
    """
    try:
        # Execute remotely on Modal
        with app.run():
            result = execute_code.remote(code)
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
