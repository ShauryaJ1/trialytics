"""
Advanced PDF processing with pdfplumber for local files
Includes tables, images, and structured extraction
"""

import pdfplumber
import os
import sys
import json
from typing import Dict, List, Any

def extract_tables_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """Extract tables from PDF and convert to structured data."""
    
    tables_data = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            # Extract tables from the page
            tables = page.extract_tables()
            
            if tables:
                for table_idx, table in enumerate(tables):
                    # Clean up the table data
                    cleaned_table = []
                    for row in table:
                        # Remove None values and clean strings
                        cleaned_row = [str(cell).strip() if cell else "" for cell in row]
                        if any(cleaned_row):  # Skip completely empty rows
                            cleaned_table.append(cleaned_row)
                    
                    if cleaned_table:
                        tables_data.append({
                            "page": page_num,
                            "table_index": table_idx + 1,
                            "rows": len(cleaned_table),
                            "columns": len(cleaned_table[0]) if cleaned_table else 0,
                            "data": cleaned_table
                        })
    
    return tables_data


def extract_structured_text(pdf_path: str) -> Dict[str, Any]:
    """Extract text with formatting and position information."""
    
    structured_data = {
        "metadata": {},
        "pages": [],
        "summary": {}
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        # Extract metadata
        structured_data["metadata"] = pdf.metadata or {}
        
        total_chars = 0
        total_words = 0
        
        for page_num, page in enumerate(pdf.pages, 1):
            # Extract text with different methods
            plain_text = page.extract_text()
            
            # Get character-level information (useful for understanding layout)
            chars = page.chars if hasattr(page, 'chars') else []
            
            # Analyze text structure
            lines = plain_text.split('\n') if plain_text else []
            
            # Identify potential headers (lines with specific formatting)
            headers = []
            for line in lines:
                # Simple heuristic: short lines in caps might be headers
                if line and len(line) < 80 and line.isupper():
                    headers.append(line)
            
            page_data = {
                "page_number": page_num,
                "text": plain_text,
                "line_count": len(lines),
                "char_count": len(plain_text) if plain_text else 0,
                "word_count": len(plain_text.split()) if plain_text else 0,
                "potential_headers": headers,
                "has_tables": bool(page.extract_tables()),
                "bbox": {
                    "width": float(page.width),
                    "height": float(page.height)
                }
            }
            
            structured_data["pages"].append(page_data)
            total_chars += page_data["char_count"]
            total_words += page_data["word_count"]
        
        # Add summary statistics
        structured_data["summary"] = {
            "total_pages": len(pdf.pages),
            "total_characters": total_chars,
            "total_words": total_words,
            "avg_chars_per_page": total_chars // len(pdf.pages) if pdf.pages else 0,
            "avg_words_per_page": total_words // len(pdf.pages) if pdf.pages else 0
        }
    
    return structured_data


def process_medical_pdf(pdf_path: str, output_dir: str = "pdf_output"):
    """
    Process a medical/clinical PDF and extract structured information.
    Particularly useful for Clinical Study Reports (CSR), protocols, etc.
    """
    
    print(f"🏥 Processing Medical PDF: {pdf_path}")
    print("=" * 60)
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Extract structured text
    print("📝 Extracting structured text...")
    structured_text = extract_structured_text(pdf_path)
    
    # Save structured text as JSON
    json_output = os.path.join(output_dir, "structured_text.json")
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump(structured_text, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Saved to: {json_output}")
    
    # Extract tables
    print("\n📊 Extracting tables...")
    tables = extract_tables_from_pdf(pdf_path)
    
    if tables:
        # Save tables as JSON
        tables_json = os.path.join(output_dir, "extracted_tables.json")
        with open(tables_json, 'w', encoding='utf-8') as f:
            json.dump(tables, f, indent=2, ensure_ascii=False)
        print(f"  ✓ Found {len(tables)} tables")
        print(f"  ✓ Saved to: {tables_json}")
        
        # Also save tables as CSV files
        for i, table_data in enumerate(tables):
            csv_file = os.path.join(output_dir, f"table_{i+1}_page{table_data['page']}.csv")
            
            import csv
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                for row in table_data['data']:
                    writer.writerow(row)
            print(f"  ✓ Table {i+1} saved as: {csv_file}")
    else:
        print("  ℹ No tables found in PDF")
    
    # Extract plain text
    print("\n📄 Extracting plain text...")
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n\n"
    
    text_output = os.path.join(output_dir, "full_text.txt")
    with open(text_output, 'w', encoding='utf-8') as f:
        f.write(full_text)
    print(f"  ✓ Saved to: {text_output}")
    
    # Print summary
    print("\n📊 Summary Statistics:")
    print(f"  • Total pages: {structured_text['summary']['total_pages']}")
    print(f"  • Total words: {structured_text['summary']['total_words']:,}")
    print(f"  • Total characters: {structured_text['summary']['total_characters']:,}")
    print(f"  • Tables found: {len(tables)}")
    
    # Look for common medical document sections
    print("\n🔍 Detected Sections:")
    common_sections = [
        "ABSTRACT", "INTRODUCTION", "METHODS", "RESULTS", 
        "DISCUSSION", "CONCLUSION", "REFERENCES",
        "ADVERSE EVENTS", "DEMOGRAPHICS", "EFFICACY", "SAFETY"
    ]
    
    found_sections = []
    for page_data in structured_text['pages']:
        for header in page_data.get('potential_headers', []):
            for section in common_sections:
                if section in header.upper():
                    found_sections.append((section, page_data['page_number']))
    
    if found_sections:
        for section, page in found_sections:
            print(f"  • {section} (Page {page})")
    else:
        print("  • No standard sections detected")
    
    print("\n✅ Processing complete!")
    print(f"📁 All outputs saved to: {os.path.abspath(output_dir)}/")
    
    return {
        "structured_text": structured_text,
        "tables": tables,
        "output_directory": os.path.abspath(output_dir)
    }


if __name__ == "__main__":
    # Default PDF path (update this to your file)
    default_pdf = "csr format.pdf"
    
    # Get PDF path from command line or use default
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else default_pdf
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(f"❌ Error: File not found: {pdf_path}")
        print("\nUsage:")
        print(f"  python {sys.argv[0]} <path_to_pdf>")
        print(f"\nExample:")
        print(f"  python {sys.argv[0]} medical_report.pdf")
        sys.exit(1)
    
    # Process the PDF
    try:
        result = process_medical_pdf(pdf_path)
        
        # Optionally, you can use the returned data for further processing
        # For example, send to S3, database, or API
        
    except Exception as e:
        print(f"❌ Error processing PDF: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
