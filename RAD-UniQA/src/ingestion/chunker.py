"""
chunker.py
Responsibility: Hierarchical Parent-Child chunking logic:
  - Child chunks (250 tokens / chars): search candidates for high-precision retrieval
  - Parent chunks (1000 tokens / chars): full synthesis context for LLM generation

Each child chunk carries a parent_chunk_id back-link.
"""
from typing import List, Tuple, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import uuid


def create_parent_child_chunks(
    pages: List[Dict[str, Any]],
    metadata: Dict[str, Any],
    source_filename: str,
    parent_chunk_size: int = 1000,
    child_chunk_size: int = 250
) -> Tuple[List[Document], List[Document]]:
    """
    Creates linked Parent and Child chunks from parsed document pages.
    
    Returns:
        (parent_documents, child_documents)
    """
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=100,
        separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " "]
    )
    
    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=30,
        separators=["\n\n", "\n", ". ", " "]
    )
    
    parents: List[Document] = []
    children: List[Document] = []
    
    # Process page by page to retain accurate page numbering
    for page in pages:
        page_num = page["page_number"]
        page_content = page["markdown_text"]
        
        if not page_content.strip():
            continue
            
        page_meta = {
            **metadata,
            "source": source_filename,
            "page_number": page_num,
        }
        
        page_parents = parent_splitter.create_documents(
            [page_content],
            metadatas=[{**page_meta, "chunk_type": "parent"}]
        )
        
        for p_doc in page_parents:
            parent_id = str(uuid.uuid4())
            p_doc.metadata["chunk_id"] = parent_id
            parents.append(p_doc)
            
            # Split this parent into child search candidates
            child_docs = child_splitter.create_documents(
                [p_doc.page_content],
                metadatas=[{
                    **p_doc.metadata,
                    "chunk_type": "child",
                    "parent_chunk_id": parent_id,
                    "chunk_id": str(uuid.uuid4())
                }]
            )
            children.extend(child_docs)
            
    return parents, children
