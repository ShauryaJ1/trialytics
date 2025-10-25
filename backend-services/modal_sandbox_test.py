"""
Modal Sandbox Test - Run arbitrary Python code with scientific computing packages
"""
import modal
import sys
from typing import Optional

# Create the app
app = modal.App("python-sandbox-test")

# Define the image with scientific computing packages
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "pandas==2.2.0",
        "numpy==1.26.3",
        "scipy==1.12.0",
        "matplotlib==3.8.2",
        "scikit-learn==1.4.0",
        "jupyter==1.0.0",
        "ipython==8.20.0",
    )
)

# Create a sandbox configuration with generous limits
sandbox_config = modal.Sandbox(
    timeout=300,  # 5 minutes timeout
    memory_limit=2048,  # 2GB memory
    cpu=2.0,  # 2 CPU cores
)


@app.function(
    image=image,
    sandbox=sandbox_config,
    timeout=600,
)
def run_code(code: str) -> dict:
    """
    Execute arbitrary Python code in a sandboxed environment.
    
    Args:
        code: Python code to execute
    
    Returns:
        Dictionary with output, error, and any returned value
    """
    import sys
    import io
    import traceback
    
    # Capture stdout and stderr
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    
    result = {
        "output": "",
        "error": "",
        "return_value": None,
        "success": False
    }
    
    try:
        # Redirect output
        sys.stdout = stdout_capture
        sys.stderr = stderr_capture
        
        # Create a namespace for execution
        exec_namespace = {}
        
        # Execute the code
        exec(code, exec_namespace)
        
        # If the code defines a main() function, call it
        if 'main' in exec_namespace and callable(exec_namespace['main']):
            return_value = exec_namespace['main']()
            result["return_value"] = str(return_value) if return_value is not None else None
        
        # Capture any variables named 'result' or 'output'
        if 'result' in exec_namespace:
            result["return_value"] = str(exec_namespace['result'])
        elif 'output' in exec_namespace:
            result["return_value"] = str(exec_namespace['output'])
        
        result["success"] = True
        
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
    
    finally:
        # Restore stdout and stderr
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        
        # Capture output
        result["output"] = stdout_capture.getvalue()
        error_output = stderr_capture.getvalue()
        if error_output:
            result["error"] = error_output + result["error"]
    
    return result


@app.function(image=image, sandbox=sandbox_config)
def run_notebook_cell(code: str, previous_state: Optional[dict] = None) -> dict:
    """
    Run code like a Jupyter notebook cell with persistent state.
    
    Args:
        code: Python code to execute
        previous_state: Dictionary containing variables from previous executions
    
    Returns:
        Dictionary with output and updated state
    """
    import sys
    import io
    import traceback
    import pickle
    import base64
    
    # Initialize or restore state
    exec_namespace = previous_state if previous_state else {}
    
    # Capture output
    old_stdout = sys.stdout
    stdout_capture = io.StringIO()
    sys.stdout = stdout_capture
    
    result = {
        "output": "",
        "error": "",
        "state": {},
        "success": False
    }
    
    try:
        # Execute the code
        exec(code, exec_namespace)
        
        # Serialize the state (only serializable objects)
        state_to_save = {}
        for key, value in exec_namespace.items():
            if not key.startswith('__'):
                try:
                    # Try to pickle the object to ensure it's serializable
                    pickle.dumps(value)
                    state_to_save[key] = value
                except:
                    # If not serializable, store a string representation
                    state_to_save[key] = f"<{type(value).__name__} object>"
        
        result["state"] = state_to_save
        result["success"] = True
        
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
    
    finally:
        sys.stdout = old_stdout
        result["output"] = stdout_capture.getvalue()
    
    return result


@app.function(image=image, sandbox=sandbox_config)
def test_environment():
    """
    Test that all required packages are installed and working.
    """
    import pandas as pd
    import numpy as np
    import scipy
    import matplotlib.pyplot as plt
    import sklearn
    
    info = {
        "pandas_version": pd.__version__,
        "numpy_version": np.__version__,
        "scipy_version": scipy.__version__,
        "matplotlib_version": plt.matplotlib.__version__,
        "sklearn_version": sklearn.__version__,
    }
    
    # Run a simple test
    df = pd.DataFrame({
        'A': np.random.randn(100),
        'B': np.random.randn(100)
    })
    
    stats = {
        "df_shape": df.shape,
        "df_mean_A": float(df['A'].mean()),
        "df_std_B": float(df['B'].std()),
        "scipy_pi": float(scipy.constants.pi),
    }
    
    return {
        "versions": info,
        "test_results": stats,
        "status": "Environment test successful!"
    }


# Example usage functions
@app.local_entrypoint()
def main():
    """
    Main entry point with example usage.
    """
    print("🚀 Modal Python Sandbox Test")
    print("=" * 50)
    
    # Test 1: Check environment
    print("\n📦 Testing environment...")
    env_test = test_environment.remote()
    print(f"Installed packages: {env_test['versions']}")
    print(f"Status: {env_test['status']}")
    
    # Test 2: Run simple code
    print("\n🧮 Running simple calculation...")
    simple_code = """
import numpy as np
arr = np.array([1, 2, 3, 4, 5])
result = arr.mean()
print(f"Mean of array: {result}")
print(f"Sum of array: {arr.sum()}")
"""
    result = run_code.remote(simple_code)
    print(f"Output: {result['output']}")
    if result['error']:
        print(f"Error: {result['error']}")
    
    # Test 3: Run pandas analysis
    print("\n📊 Running pandas analysis...")
    pandas_code = """
import pandas as pd
import numpy as np

# Create sample data
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=10),
    'sales': np.random.randint(100, 1000, 10),
    'profit': np.random.uniform(10, 100, 10)
})

print("Dataset Summary:")
print(df.describe())
print(f"\\nTotal sales: {df['sales'].sum()}")
print(f"Average profit: {df['profit'].mean():.2f}")

result = {
    'total_sales': int(df['sales'].sum()),
    'avg_profit': float(df['profit'].mean())
}
"""
    result = run_code.remote(pandas_code)
    print(f"Output:\n{result['output']}")
    if result['return_value']:
        print(f"Return value: {result['return_value']}")
    
    # Test 4: Interactive notebook-style execution
    print("\n📓 Running notebook-style cells...")
    
    # Cell 1: Import and create data
    cell1 = """
import pandas as pd
import numpy as np
from scipy import stats

data = np.random.normal(100, 15, 1000)
df = pd.DataFrame({'values': data})
print(f"Created dataset with {len(df)} rows")
"""
    
    result1 = run_notebook_cell.remote(cell1)
    print(f"Cell 1 output: {result1['output']}")
    
    # Cell 2: Analyze data (uses previous state)
    cell2 = """
# Using df from previous cell
summary = df.describe()
print(summary)

# Perform statistical test
shapiro_stat, shapiro_p = stats.shapiro(df['values'].sample(100))
print(f"\\nShapiro-Wilk test: statistic={shapiro_stat:.4f}, p-value={shapiro_p:.4f}")
"""
    
    result2 = run_notebook_cell.remote(cell2, result1['state'])
    print(f"Cell 2 output: {result2['output']}")
    
    print("\n✅ All tests completed successfully!")


@app.local_entrypoint()
def interactive():
    """
    Interactive mode - enter Python code to execute in the sandbox.
    """
    print("🐍 Modal Python Sandbox - Interactive Mode")
    print("=" * 50)
    print("Enter Python code (type 'exit' to quit, 'multiline' for multi-line mode)")
    print("Available packages: pandas, numpy, scipy, matplotlib, scikit-learn")
    print()
    
    state = {}
    
    while True:
        try:
            mode = input(">>> ")
            
            if mode.lower() == 'exit':
                print("Goodbye!")
                break
            
            if mode.lower() == 'multiline':
                print("Enter code (end with '###' on a new line):")
                lines = []
                while True:
                    line = input("... ")
                    if line == '###':
                        break
                    lines.append(line)
                code = '\n'.join(lines)
            else:
                code = mode
            
            # Execute the code
            result = run_notebook_cell.remote(code, state)
            
            # Update state for next execution
            if result['success']:
                state = result['state']
            
            # Display output
            if result['output']:
                print(result['output'], end='')
            
            if result['error']:
                print(f"Error: {result['error']}", file=sys.stderr)
                
        except KeyboardInterrupt:
            print("\nUse 'exit' to quit")
        except Exception as e:
            print(f"Local error: {e}")


if __name__ == "__main__":
    # Check if interactive mode is requested
    if len(sys.argv) > 1 and sys.argv[1] == "interactive":
        interactive()
    else:
        main()
