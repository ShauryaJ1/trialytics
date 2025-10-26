import requests
import pdfplumber
import io

# Your pre-signed S3 URL
pdf_url = "https://medical-data-443370691698.s3.us-east-1.amazonaws.com/inputs/1761476881619_calhacks%20idea%20doc.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAWOOXT3RZCAN4BCVB%2F20251026%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251026T110802Z&X-Amz-Expires=3600&X-Amz-Signature=46638e64992039f8c603ecc59e4c3781ce66c548049f0ba3b6dcad93f3f0d63b&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"

# Download the PDF
response = requests.get(pdf_url)
response.raise_for_status()

# Open the PDF with pdfplumber
with pdfplumber.open(io.BytesIO(response.content)) as pdf:
    # Extract text from all pages
    full_text = ""
    for i, page in enumerate(pdf.pages, 1):
        text = page.extract_text()
        full_text += f"\n--- Page {i} ---\n{text}"
    
    print(f"Total pages: {len(pdf.pages)}")
    print(full_text)