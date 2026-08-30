"""
test_ingestion.py
Unit tests for metadata parsing, chunking, and parent-child linkage.
"""
from src.ingestion.metadata import extract_metadata_from_filename
from src.ingestion.chunker import create_parent_child_chunks


def test_metadata_extraction():
    meta1 = extract_metadata_from_filename("NLP_Module_3_Notes_2024.pdf")
    assert meta1["subject"] == "NLP"
    assert meta1["module_number"] == 3
    assert meta1["academic_year"] == 2024
    assert meta1["document_type"] == "notes"

    meta2 = extract_metadata_from_filename("ML_2023_QP.pdf")
    assert meta2["subject"] == "Machine Learning"
    assert meta2["academic_year"] == 2023
    assert meta2["document_type"] == "question_paper"


def test_parent_child_chunking():
    sample_pages = [
        {
            "page_number": 1,
            "markdown_text": "## Introduction to Word2Vec\n\nWord2Vec is a two-layer neural net that processes text by vectorizing words. " * 30,
            "raw_text": "..."
        }
    ]
    meta = {"subject": "NLP", "module_number": 2}
    parents, children = create_parent_child_chunks(
        pages=sample_pages,
        metadata=meta,
        source_filename="word2vec.pdf",
        parent_chunk_size=500,
        child_chunk_size=150
    )

    assert len(parents) >= 1
    assert len(children) >= 1

    # Ensure all children link back to a valid parent_chunk_id
    parent_ids = {p.metadata["chunk_id"] for p in parents}
    for c in children:
        assert c.metadata["parent_chunk_id"] in parent_ids
        assert c.metadata["chunk_type"] == "child"
        assert c.metadata["page_number"] == 1
