"""
Quick Modal Sandbox - Run arbitrary Python code with one command
"""
import modal
import sys

app = modal.App("quick-python-sandbox")

# Image with data science packages
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "requests", "beautifulsoup4"
)


@app.function(
    image=image,
    timeout=120,
    memory=2048,
    cpu=2.0,
)
def run(code: str):
    """Execute Python code and return output."""
    import io
    import sys
    import traceback
    
    stdout = io.StringIO()
    stderr = io.StringIO()
    
    # Redirect outputs
    sys.stdout = stdout
    sys.stderr = stderr
    
    try:
        # Execute code
        exec(code)
        output = stdout.getvalue()
        error = stderr.getvalue()
        
        return {
            "success": True,
            "output": output,
            "error": error
        }
    except Exception as e:
        return {
            "success": False,
            "output": stdout.getvalue(),
            "error": f"{e}\n{traceback.format_exc()}"
        }
    finally:
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__


@app.local_entrypoint()
def main(code: str = None):
    """
    Run Python code in the sandbox.
    
    Usage:
        modal run modal_quick_sandbox.py --code "print('Hello from Modal!')"
        modal run modal_quick_sandbox.py  # Interactive mode
    """
    if code:
        # Run provided code
        result = run.remote(code)
        if result["output"]:
            print(result["output"])
        if result["error"]:
            print(f"❌ Error: {result['error']}", file=sys.stderr)
    else:
        # Interactive REPL
        print("🐍 Modal Quick Sandbox")
        print("Type Python code and press Enter (or 'exit' to quit)")
        print("-" * 40)
        
        while True:
            try:
                code_input = input(">>> ")
                if code_input.lower() == 'exit':
                    break
                    
                result = run.remote(code_input)
                if result["output"]:
                    print(result["output"], end="")
                if result["error"]:
                    print(f"Error: {result['error']}", file=sys.stderr)
                    
            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")


# Quick test function
@app.function(image=image)
def test_packages():
    """Test that all packages are working."""
    import pandas as pd
    import numpy as np
    import scipy
    
    print(f"✅ Pandas {pd.__version__}")
    print(f"✅ NumPy {np.__version__}")
    print(f"✅ SciPy {scipy.__version__}")
    
    # Quick test
    df = pd.DataFrame(np.random.randn(5, 3), columns=['A', 'B', 'C'])
    print(f"\n📊 Sample DataFrame:\n{df}")
    print(f"\n📈 Statistics:\n{df.describe()}")
    
    return "All packages working!"


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--code", help="Python code to execute", default=None)
    parser.add_argument("--test", action="store_true", help="Test packages")
    args = parser.parse_args()
    
    if args.test:
        with app.run():
            print(test_packages.remote())
    else:
        main(args.code)
