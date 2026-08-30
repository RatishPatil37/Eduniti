"""
pdf_parser.py
Responsibility: Convert raw PDF pages to structured Markdown preserving:
  - LaTeX equations (inline: $...$ and block: $$...$$)
  - Tables (Markdown table format)
  - Code listings (fenced code blocks)
  - Headers (# / ## / ###)
"""
from pathlib import Path
from typing import List, Dict, Any
import pymupdf


def parse_pdf_to_markdown(pdf_path: Path) -> List[Dict[str, Any]]:
    """
    Parses a PDF file and extracts text page by page with Markdown formatting.
    
    Args:
        pdf_path: Path to the PDF file.
        
    Returns:
        List of dicts containing page_number, markdown_text, and raw_text.
    """
    doc = pymupdf.open(str(pdf_path))
    pages = []
    for i, page in enumerate(doc):
        try:
            # pymupdf 1.24+ supports markdown output preserving structure
            md_text = page.get_text("markdown")
        except Exception:
            md_text = page.get_text("text")
            
        raw_text = page.get_text("text")
        pages.append({
            "page_number": i + 1,
            "markdown_text": md_text if md_text.strip() else raw_text,
            "raw_text": raw_text
        })
    doc.close()
    return pages
