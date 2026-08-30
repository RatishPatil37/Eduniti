"""
metadata.py
Responsibility: Automatically tag document chunks with:
  - subject (e.g., NLP, Machine Learning)
  - module_number (from filename convention: Module_3_Notes.pdf)
  - academic_year (from filename or header)
  - document_type ("textbook" | "question_paper" | "notes")
"""
import re
from pathlib import Path
from typing import Dict, Any


def extract_metadata_from_filename(filename: str, default_subject: str = "NLP") -> Dict[str, Any]:
    """
    Infers structured metadata from file naming patterns.
    Examples:
      - NLP_Module3_Notes_2024.pdf
      - ML_2023_QP.pdf
      - Unit2_LectureNotes.pdf
    """
    name = Path(filename).stem
    
    metadata: Dict[str, Any] = {
        "subject": default_subject,
        "module_number": None,
        "academic_year": None,
        "document_type": "textbook"
    }
    
    # Extract subject if present in filename
    if "nlp" in name.lower():
        metadata["subject"] = "NLP"
    elif "ml" in name.lower() or "machine_learning" in name.lower():
        metadata["subject"] = "Machine Learning"
    elif "ai" in name.lower():
        metadata["subject"] = "Artificial Intelligence"
        
    # Extract module/unit number
    module_match = re.search(r'(?:module|unit|mod|m|u)[_\-\s]?(\d+)', name, re.IGNORECASE)
    if module_match:
        metadata["module_number"] = int(module_match.group(1))
        
    # Extract academic year
    year_match = re.search(r'(20\d{2})', name)
    if year_match:
        metadata["academic_year"] = int(year_match.group(1))
        
    # Determine document type
    lower_name = name.lower()
    if any(k in lower_name for k in ["qp", "paper", "exam", "pyq", "question"]):
        metadata["document_type"] = "question_paper"
    elif any(k in lower_name for k in ["note", "notes", "lecture", "slide"]):
        metadata["document_type"] = "notes"
    elif any(k in lower_name for k in ["syllabus", "curriculum"]):
        metadata["document_type"] = "syllabus"
        
    return metadata
