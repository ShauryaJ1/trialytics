"""
Example: Using Modal Server with S3 File Processing
This shows how to use the enhanced /execute endpoint with S3 files.
"""

import requests
import json

# Configuration
MODAL_SERVER_URL = "http://localhost:8000"

def example_csv_processing():
    """
    Example: Process a CSV file from S3.
    
    When you provide file_type='csv' and an input_file_url:
    - Modal automatically downloads the file
    - Loads it as a pandas DataFrame named 'df'
    - Makes pandas available as 'pd'
    """
    
    request_payload = {
        "code": """
# The CSV is already loaded as 'df' - no need to import or load anything!
print(f"Dataset shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

# Do your analysis
summary = df.describe()
print("\\nStatistical Summary:")
print(summary)

# Check for missing values
missing = df.isnull().sum()
print("\\nMissing Values:")
print(missing[missing > 0])

# Create output - just assign to output_content
output_content = summary  # This will be uploaded as CSV
""",
        "input_file_url": "YOUR_PRESIGNED_GET_URL",  # From your NextJS app
        "output_file_url": "YOUR_PRESIGNED_PUT_URL",  # For uploading results
        "file_type": "csv",
        "timeout": 300
    }
    
    response = requests.post(f"{MODAL_SERVER_URL}/execute", json=request_payload)
    return response.json()


def example_xpt_processing():
    """
    Example: Process a SAS transport file (XPT).
    
    When you provide file_type='xpt':
    - Modal loads it using pyreadstat
    - Provides 'df' (DataFrame) and 'meta' (metadata)
    """
    
    request_payload = {
        "code": """
# XPT file is loaded as 'df' with metadata in 'meta'
print(f"Dataset: {meta.file_label if hasattr(meta, 'file_label') else 'Unknown'}")
print(f"Shape: {df.shape}")

# Show variable labels if available
if hasattr(meta, 'column_labels'):
    labels = dict(zip(df.columns, meta.column_labels))
    print("\\nVariable Labels:")
    for col, label in labels.items():
        print(f"  {col}: {label}")

# Convert to CSV for easier processing
output_content = df  # Will be saved as CSV
""",
        "input_file_url": "YOUR_XPT_PRESIGNED_URL",
        "output_file_url": "YOUR_OUTPUT_PRESIGNED_URL", 
        "file_type": "xpt",
        "timeout": 300
    }
    
    response = requests.post(f"{MODAL_SERVER_URL}/execute", json=request_payload)
    return response.json()


def example_pdf_processing():
    """
    Example: Extract text from a PDF.
    
    When you provide file_type='pdf':
    - Modal loads it using PyPDF2
    - Provides 'pdf_reader' object
    """
    
    request_payload = {
        "code": """
# PDF is loaded as 'pdf_reader'
num_pages = len(pdf_reader.pages)
print(f"Document has {num_pages} pages")

# Extract text from all pages
all_text = []
for i, page in enumerate(pdf_reader.pages):
    page_text = page.extract_text()
    all_text.append(f"\\n--- Page {i+1} ---\\n{page_text}")
    print(f"Page {i+1}: {len(page_text)} characters extracted")

# Save extracted text
output_content = "".join(all_text)
print(f"\\nTotal text extracted: {len(output_content)} characters")
""",
        "input_file_url": "YOUR_PDF_PRESIGNED_URL",
        "output_file_url": "YOUR_TEXT_OUTPUT_URL",
        "file_type": "pdf",
        "timeout": 300
    }
    
    response = requests.post(f"{MODAL_SERVER_URL}/execute", json=request_payload)
    return response.json()


def example_custom_processing():
    """
    Example: Custom processing without file type hint.
    
    If you don't specify file_type:
    - File content is available as raw bytes in 'file_content'
    - You handle the loading yourself
    """
    
    request_payload = {
        "code": """
# File is available as raw bytes in 'file_content'
print(f"File size: {len(file_content)} bytes")

# You can process it however you want
# Example: Load as JSON
import json
data = json.loads(file_content.decode('utf-8'))
print(f"Loaded JSON with {len(data)} items")

# Process and create output
result = {"processed": len(data), "status": "complete"}
output_content = json.dumps(result, indent=2)
""",
        "input_file_url": "YOUR_JSON_PRESIGNED_URL",
        "output_file_url": "YOUR_OUTPUT_PRESIGNED_URL",
        # No file_type specified - you handle it yourself
        "timeout": 120
    }
    
    response = requests.post(f"{MODAL_SERVER_URL}/execute", json=request_payload)
    return response.json()


def example_no_s3():
    """
    Example: Regular code execution without S3.
    The endpoint is backward compatible - S3 parameters are optional.
    """
    
    request_payload = {
        "code": """
import numpy as np
import pandas as pd

# Generate random data
data = np.random.randn(100, 3)
df = pd.DataFrame(data, columns=['A', 'B', 'C'])

print("Generated random dataset:")
print(df.describe())

# Calculate correlations
print("\\nCorrelation matrix:")
print(df.corr())
"""
    }
    
    response = requests.post(f"{MODAL_SERVER_URL}/execute", json=request_payload)
    return response.json()


def generate_presigned_urls_example():
    """
    Example: How to generate presigned URLs in Python.
    This would typically be done in your NextJS backend.
    """
    
    import boto3
    from botocore.client import Config
    
    # Initialize S3 client
    s3 = boto3.client(
        's3',
        region_name='us-east-1',
        config=Config(signature_version='s3v4'),
        aws_access_key_id='YOUR_KEY',
        aws_secret_access_key='YOUR_SECRET'
    )
    
    # Generate GET URL for input file
    input_url = s3.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': 'medical-data-443370691698',
            'Key': 'inputs/data.csv'
        },
        ExpiresIn=3600  # 1 hour
    )
    
    # Generate PUT URL for output file
    output_url = s3.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': 'medical-data-443370691698',
            'Key': 'outputs/results.csv'
        },
        ExpiresIn=3600
    )
    
    return input_url, output_url


if __name__ == "__main__":
    print("Modal S3 Integration Examples")
    print("="*50)
    print("\nThis script shows how to use the Modal server with S3 files.")
    print("\nKey points:")
    print("1. S3 parameters are optional - regular execution still works")
    print("2. Files are automatically loaded based on file_type")
    print("3. Just create 'output_content' to upload results")
    print("4. Common libraries (pd, np, requests, io) are pre-imported")
    print("\nTo run these examples:")
    print("1. Start the Modal server: python app.py")
    print("2. Generate presigned URLs from your NextJS app")
    print("3. Replace the placeholder URLs in this script")
    print("4. Run the examples")
