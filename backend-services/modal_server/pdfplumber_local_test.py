import pdfplumber
import os

# Path to your local PDF file
# Update this path to point to your actual PDF file
pdf_path = "csr format.pdf"  # or use absolute path like "C:/Users/jains/cs_stuff/medical/backend-services/modal_server/csr format.pdf"

# Check if file exists
if not os.path.exists(pdf_path):
    print(f"❌ File not found: {pdf_path}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Files in current directory: {os.listdir('.')}")
    exit(1)

print(f"📄 Reading PDF from: {pdf_path}")
print(f"File size: {os.path.getsize(pdf_path):,} bytes")
print("=" * 60)

# Open the PDF with pdfplumber
with pdfplumber.open(pdf_path) as pdf:
    # Get metadata
    metadata = pdf.metadata
    if metadata:
        print("📋 PDF Metadata:")
        for key, value in metadata.items():
            if value:
                print(f"  {key}: {value}")
        print("=" * 60)
    
    print(f"📑 Total pages: {len(pdf.pages)}")
    print("=" * 60)
    
    # Extract text from all pages
    full_text = ""
    for i, page in enumerate(pdf.pages, 1):
        text = page.extract_text()
        
        # Add page marker
        full_text += f"\n{'='*20} Page {i} {'='*20}\n"
        full_text += text if text else "[No text extracted from this page]"
        
        # Print progress for large PDFs
        if i % 10 == 0:
            print(f"  Processing page {i}/{len(pdf.pages)}...")
    
    print("\n📝 Extracted Text:")
    print("=" * 60)
    print(full_text)
    
    # Optional: Save extracted text to file
    output_file = pdf_path.replace('.pdf', '_extracted.txt')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(full_text)
    print(f"\n✅ Text saved to: {output_file}")
    
    # Show some statistics
    print(f"\n📊 Statistics:")
    print(f"  Total characters extracted: {len(full_text):,}")
    print(f"  Total words (approx): {len(full_text.split()):,}")
    print(f"  Average chars per page: {len(full_text) // len(pdf.pages):,}")
