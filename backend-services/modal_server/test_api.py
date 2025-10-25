#!/usr/bin/env python3
"""
Test script for Modal FastAPI server.
Tests various endpoints and code execution scenarios.
"""

import requests
import json
import sys
import time
from typing import Dict, Any

# Configuration
API_URL = "http://localhost:8000"  # Change this if testing remote server

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_test(name: str, passed: bool, details: str = ""):
    """Print formatted test result."""
    status = f"{Colors.GREEN}✓ PASSED{Colors.RESET}" if passed else f"{Colors.RED}✗ FAILED{Colors.RESET}"
    print(f"{status} - {name}")
    if details:
        print(f"         {Colors.YELLOW}{details}{Colors.RESET}")

def test_health_endpoint():
    """Test the health check endpoint."""
    try:
        response = requests.get(f"{API_URL}/health")
        data = response.json()
        passed = response.status_code == 200 and data.get("status") in ["healthy", "degraded"]
        details = f"Status: {data.get('status')}, Modal: {data.get('modal_connected')}"
        print_test("Health Check", passed, details)
        return passed
    except Exception as e:
        print_test("Health Check", False, str(e))
        return False

def test_root_endpoint():
    """Test the root endpoint."""
    try:
        response = requests.get(f"{API_URL}/")
        data = response.json()
        passed = response.status_code == 200 and "name" in data
        print_test("Root Endpoint", passed)
        return passed
    except Exception as e:
        print_test("Root Endpoint", False, str(e))
        return False

def test_execute_simple():
    """Test simple code execution."""
    try:
        response = requests.post(
            f"{API_URL}/execute",
            json={"code": "print('Hello, Modal!')"}
        )
        data = response.json()
        passed = (
            response.status_code == 200 
            and data.get("success") == True
            and "Hello, Modal!" in data.get("output", "")
        )
        details = f"Output: {data.get('output', '').strip()}"
        print_test("Simple Execution", passed, details)
        return passed
    except Exception as e:
        print_test("Simple Execution", False, str(e))
        return False

def test_execute_with_imports():
    """Test code execution with package imports."""
    code = """
import numpy as np
import pandas as pd

arr = np.array([1, 2, 3, 4, 5])
print(f"Array mean: {arr.mean()}")
print(f"Array sum: {arr.sum()}")
"""
    try:
        response = requests.post(
            f"{API_URL}/execute",
            json={"code": code}
        )
        data = response.json()
        passed = (
            response.status_code == 200 
            and data.get("success") == True
            and "Array mean: 3.0" in data.get("output", "")
        )
        print_test("Package Imports", passed)
        return passed
    except Exception as e:
        print_test("Package Imports", False, str(e))
        return False

def test_execute_with_error():
    """Test error handling in code execution."""
    try:
        response = requests.post(
            f"{API_URL}/execute",
            json={"code": "1 / 0"}
        )
        data = response.json()
        passed = (
            response.status_code == 200 
            and data.get("success") == False
            and "ZeroDivisionError" in data.get("error", "")
        )
        print_test("Error Handling", passed)
        return passed
    except Exception as e:
        print_test("Error Handling", False, str(e))
        return False

def test_execute_syntax_error():
    """Test syntax error handling."""
    try:
        response = requests.post(
            f"{API_URL}/execute",
            json={"code": "print('unclosed string"}
        )
        data = response.json()
        passed = (
            response.status_code == 200 
            and data.get("success") == False
            and "SyntaxError" in data.get("error", "")
        )
        print_test("Syntax Error Handling", passed)
        return passed
    except Exception as e:
        print_test("Syntax Error Handling", False, str(e))
        return False

def test_execute_pandas():
    """Test pandas functionality."""
    code = """
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'A': [1, 2, 3],
    'B': [4, 5, 6]
})
print(f"DataFrame shape: {df.shape}")
print(f"Column A sum: {df['A'].sum()}")
"""
    try:
        response = requests.post(
            f"{API_URL}/execute",
            json={"code": code}
        )
        data = response.json()
        passed = (
            response.status_code == 200 
            and data.get("success") == True
            and "DataFrame shape: (3, 2)" in data.get("output", "")
            and "Column A sum: 6" in data.get("output", "")
        )
        print_test("Pandas Execution", passed)
        return passed
    except Exception as e:
        print_test("Pandas Execution", False, str(e))
        return False

def test_execute_timeout():
    """Test timeout parameter."""
    code = "print('Quick execution')"
    try:
        response = requests.post(
            f"{API_URL}/execute",
            json={"code": code, "timeout": 30}
        )
        data = response.json()
        passed = response.status_code == 200 and data.get("success") == True
        print_test("Timeout Parameter", passed)
        return passed
    except Exception as e:
        print_test("Timeout Parameter", False, str(e))
        return False

def test_examples_endpoint():
    """Test the examples endpoint."""
    try:
        response = requests.get(f"{API_URL}/examples")
        data = response.json()
        passed = response.status_code == 200 and "examples" in data
        details = f"Found {len(data.get('examples', []))} examples"
        print_test("Examples Endpoint", passed, details)
        return passed
    except Exception as e:
        print_test("Examples Endpoint", False, str(e))
        return False

def test_modal_packages():
    """Test Modal package availability."""
    try:
        response = requests.get(f"{API_URL}/test")
        data = response.json()
        passed = response.status_code == 200 and data.get("status") == "success"
        print_test("Modal Package Test", passed)
        if passed and data.get("message"):
            print(f"{Colors.BLUE}Package Info:{Colors.RESET}")
            for line in data["message"].split('\n'):
                if line.strip():
                    print(f"  {line}")
        return passed
    except Exception as e:
        print_test("Modal Package Test", False, str(e))
        return False

def run_performance_test():
    """Run a simple performance test."""
    print(f"\n{Colors.BLUE}Performance Test:{Colors.RESET}")
    
    code = """
import numpy as np
result = np.random.randn(1000, 1000).mean()
print(f"Matrix mean: {result:.6f}")
"""
    
    times = []
    for i in range(3):
        start = time.time()
        response = requests.post(
            f"{API_URL}/execute",
            json={"code": code}
        )
        elapsed = time.time() - start
        times.append(elapsed)
        
        if response.status_code == 200:
            print(f"  Run {i+1}: {elapsed:.2f}s")
        else:
            print(f"  Run {i+1}: Failed")
    
    if times:
        avg_time = sum(times) / len(times)
        print(f"  Average execution time: {avg_time:.2f}s")

def main():
    """Run all tests."""
    print(f"\n{Colors.BLUE}={'='*50}{Colors.RESET}")
    print(f"{Colors.BLUE}Modal FastAPI Server Test Suite{Colors.RESET}")
    print(f"{Colors.BLUE}Testing: {API_URL}{Colors.RESET}")
    print(f"{Colors.BLUE}={'='*50}{Colors.RESET}\n")
    
    # Check if server is accessible
    try:
        response = requests.get(f"{API_URL}/", timeout=5)
    except requests.exceptions.ConnectionError:
        print(f"{Colors.RED}❌ Cannot connect to server at {API_URL}{Colors.RESET}")
        print(f"{Colors.YELLOW}   Make sure the server is running:{Colors.RESET}")
        print(f"{Colors.YELLOW}   python app.py{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"{Colors.RED}❌ Unexpected error: {e}{Colors.RESET}")
        sys.exit(1)
    
    # Run tests
    tests = [
        test_root_endpoint,
        test_health_endpoint,
        test_execute_simple,
        test_execute_with_imports,
        test_execute_pandas,
        test_execute_with_error,
        test_execute_syntax_error,
        test_execute_timeout,
        test_examples_endpoint,
        test_modal_packages,
    ]
    
    results = []
    for test in tests:
        results.append(test())
        time.sleep(0.5)  # Small delay between tests
    
    # Run performance test
    run_performance_test()
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"\n{Colors.BLUE}={'='*50}{Colors.RESET}")
    print(f"{Colors.BLUE}Test Summary:{Colors.RESET}")
    print(f"  Passed: {Colors.GREEN}{passed}/{total}{Colors.RESET}")
    print(f"  Failed: {Colors.RED}{total - passed}/{total}{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}✨ All tests passed!{Colors.RESET}")
    else:
        print(f"\n{Colors.YELLOW}⚠️  Some tests failed. Check the output above.{Colors.RESET}")
    
    print(f"{Colors.BLUE}={'='*50}{Colors.RESET}\n")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    # Allow custom API URL via command line
    if len(sys.argv) > 1:
        API_URL = sys.argv[1]
        if not API_URL.startswith("http"):
            API_URL = f"http://{API_URL}"
        if ":" not in API_URL.split("//")[1]:  # No port specified
            API_URL = f"{API_URL}:8000"
    
    sys.exit(main())
