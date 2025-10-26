"""
Test script for S3 integration with Modal execution.
Tests both regular execution and S3 file handling capabilities.
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"

def print_response(response: Dict[str, Any], title: str = "Response"):
    """Pretty print API response."""
    print(f"\n{'='*60}")
    print(f"{title}")
    print('='*60)
    
    if response.get('success'):
        print("✅ SUCCESS")
        if response.get('output'):
            print("\nOutput:")
            print('-'*40)
            print(response['output'])
    else:
        print("❌ FAILED")
        if response.get('error'):
            print("\nError:")
            print('-'*40)
            print(response['error'])
    
    print('='*60)


def test_regular_execution():
    """Test that regular code execution still works without S3."""
    print("\n🧪 Testing regular code execution...")
    
    payload = {
        "code": """
print('Hello from Modal!')
import numpy as np
import pandas as pd

# Generate random data
data = np.random.randn(5, 3)
df = pd.DataFrame(data, columns=['A', 'B', 'C'])

print('\\nDataFrame:')
print(df)
print('\\nSummary:')
print(df.describe())
"""
    }
    
    try:
        response = requests.post(f"{BASE_URL}/execute", json=payload, timeout=60)  # Allow time for Modal execution
        response.raise_for_status()
        print_response(response.json(), "Regular Execution Test")
        return True
    except Exception as e:
        print(f"❌ Regular execution test failed: {e}")
        return False


def test_csv_processing_with_s3():
    """Test CSV processing with S3 URLs (using mock URLs for demonstration)."""
    print("\n🧪 Testing CSV processing with S3...")
    
    # Note: Replace these with actual presigned URLs when testing
    payload = {
        "code": """
# The CSV is already loaded as 'df' by Modal when file_type='csv'
print("\\n📊 Data Info:")
print(df.info())

print("\\n📊 Data Summary:")
print(df.describe())

print("\\n📊 First 5 rows:")
print(df.head())

# Process the data
processed_df = df.describe()

# Create output for S3 upload - just set output_content variable
output_content = processed_df
print("\\n📝 Created output DataFrame for upload")
""",
        "input_file_url": "https://your-bucket.s3.amazonaws.com/test.csv?X-Amz-Algorithm=...",  # Replace with real URL
        "output_file_url": "https://your-bucket.s3.amazonaws.com/output.csv?X-Amz-Algorithm=...",  # Replace with real URL
        "file_type": "csv",
        "timeout": 300
    }
    
    print("\n⚠️  Note: This test uses mock URLs. For real testing:")
    print("   1. Generate presigned URLs from your NextJS app or AWS CLI")
    print("   2. Replace the URLs in this test")
    print("   3. Ensure the input file exists in S3")
    
    try:
        response = requests.post(f"{BASE_URL}/execute", json=payload, timeout=60)
        response.raise_for_status()
        print_response(response.json(), "CSV with S3 Test")
        return True
    except Exception as e:
        print(f"❌ CSV S3 test failed: {e}")
        return False


def test_xpt_processing():
    """Test XPT (SAS) file processing."""
    print("\n🧪 Testing XPT file processing...")
    
    payload = {
        "code": """
# The XPT file is already loaded as 'df' and 'meta'
print(f"\\n📊 Dataset Info:")
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

if hasattr(meta, 'file_label'):
    print(f"File Label: {meta.file_label}")

# Display first few rows
print("\\n📊 First 5 rows:")
print(df.head())

# Convert to CSV for output
output_content = df.to_csv(index=False)
print("\\n📝 Converted XPT to CSV for output")
""",
        "input_file_url": "https://your-bucket.s3.amazonaws.com/data.xpt?X-Amz-Algorithm=...",  # Replace with real URL
        "output_file_url": "https://your-bucket.s3.amazonaws.com/output.csv?X-Amz-Algorithm=...",  # Replace with real URL
        "file_type": "xpt",
        "timeout": 300
    }
    
    try:
        response = requests.post(f"{BASE_URL}/execute", json=payload, timeout=60)
        response.raise_for_status()
        print_response(response.json(), "XPT Processing Test")
        return True
    except Exception as e:
        print(f"❌ XPT test failed: {e}")
        return False


def test_pdf_processing():
    """Test PDF file processing."""
    print("\n🧪 Testing PDF file processing...")
    
    payload = {
        "code": """
# The PDF is already loaded as 'pdf_reader'
print(f"\\n📄 PDF Info:")
print(f"Number of pages: {len(pdf_reader.pages)}")

# Extract text from all pages
all_text = []
for i, page in enumerate(pdf_reader.pages):
    text = page.extract_text()
    all_text.append(f"Page {i+1}:\\n{text}")
    print(f"\\nPage {i+1} - Characters: {len(text)}")

# Create output with extracted text
output_content = "\\n\\n".join(all_text)
print("\\n📝 Extracted text from all pages for output")
""",
        "input_file_url": "https://your-bucket.s3.amazonaws.com/document.pdf?X-Amz-Algorithm=...",  # Replace with real URL
        "output_file_url": "https://your-bucket.s3.amazonaws.com/extracted_text.txt?X-Amz-Algorithm=...",  # Replace with real URL
        "file_type": "pdf",
        "timeout": 300
    }
    
    try:
        response = requests.post(f"{BASE_URL}/execute", json=payload, timeout=60)
        response.raise_for_status()
        print_response(response.json(), "PDF Processing Test")
        return True
    except Exception as e:
        print(f"❌ PDF test failed: {e}")
        return False


def test_health_check():
    """Test the health check endpoint."""
    print("\n🧪 Testing health check...")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=30)  # Modal health check can take time
        response.raise_for_status()
        data = response.json()
        
        print(f"Status: {data.get('status')}")
        print(f"Modal Connected: {data.get('modal_connected')}")
        print(f"Message: {data.get('message')}")
        
        return data.get('status') == 'healthy'
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


def generate_presigned_url_example():
    """Show example of how to generate presigned URLs."""
    print("\n📝 Example: Generating Presigned URLs with AWS CLI")
    print('='*60)
    print("""
# For input file (GET):
aws s3 presign s3://your-bucket/test.csv --expires-in 3600

# For output file (PUT):
aws s3 presign s3://your-bucket/output.csv --expires-in 3600 --http-method PUT

# Or using Python boto3:
import boto3
from botocore.client import Config

s3 = boto3.client('s3', config=Config(signature_version='s3v4'))

# GET URL for downloading
input_url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'your-bucket', 'Key': 'test.csv'},
    ExpiresIn=3600
)

# PUT URL for uploading
output_url = s3.generate_presigned_url(
    'put_object',
    Params={'Bucket': 'your-bucket', 'Key': 'output.csv'},
    ExpiresIn=3600
)
""")
    print('='*60)


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("🚀 Modal S3 Integration Test Suite")
    print("="*60)
    
    # Check if server is running
    try:
        requests.get(f"{BASE_URL}/health", timeout=10)  # Increased timeout for Modal health check
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to server at {BASE_URL}")
        print("   Please ensure the Modal server is running:")
        print("   cd backend-services/modal_server && python app.py")
        sys.exit(1)
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_health_check()))
    results.append(("Regular Execution", test_regular_execution()))
    
    # S3 tests (will fail with mock URLs, but shows the structure)
    print("\n" + "="*60)
    print("📦 S3 Integration Tests")
    print("="*60)
    
    generate_presigned_url_example()
    
    # Uncomment these when you have real presigned URLs
    # results.append(("CSV with S3", test_csv_processing_with_s3()))
    # results.append(("XPT Processing", test_xpt_processing()))
    # results.append(("PDF Processing", test_pdf_processing()))
    
    # Print summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed. Please check the output above.")
    print("="*60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
