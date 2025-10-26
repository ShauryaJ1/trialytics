import requests
from PyPDF2 import PdfReader
import io

url_1 = "https://medical-data-443370691698.s3.us-east-1.amazonaws.com/inputs/1761477074185_calhacks%20idea%20doc.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAWOOXT3RZCAN4BCVB%2F20251026%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251026T111114Z&X-Amz-Expires=3600&X-Amz-Signature=3c7fc3b9a381ea9bfac8402c7dff8cd166ecab7290748fc0a6d550a13812af6f&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"

response = requests.get(url_1)
pdf_file = io.BytesIO(response.content)
pdf_reader = PdfReader(pdf_file)

num_pages = len(pdf_reader.pages)
print(f"Number of pages: {num_pages}")

full_text = ""
for page_num, page in enumerate(pdf_reader.pages, 1):
    text = page.extract_text()
    full_text += f"\n--- Page {page_num} ---\n{text}"

print(full_text)