"""
schemas.py
Responsibility: Strict Pydantic models for validation of incoming queries and response serialization.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., description="The university exam question")
    subject: str = Field("NLP", description="Subject code or name (e.g., 'NLP', 'ML')")
    module_filter: Optional[int] = Field(None, description="Optional module/unit number filter")
    target_marks: int = Field(5, description="Mark weighting: 2, 5, or 10")


class SourceCitation(BaseModel):
    source: str = Field(..., description="Source document filename")
    module_number: Optional[int] = Field(None, description="Associated syllabus module")
    page_number: Optional[int] = Field(None, description="Page number of cited passage")
    snippet: str = Field(..., description="Context snippet preview")


class QueryResponse(BaseModel):
    question: str
    target_marks: int
    generated_answer: str
    citations: List[SourceCitation]
    retrieval_latency_ms: float


class ChunkMetadata(BaseModel):
    document_id: str
    filename: str
    subject: str
    module_number: Optional[int] = None
    page_number: Optional[int] = None
    parent_chunk_id: Optional[str] = None
    chunk_type: str = Field(description="'parent' or 'child'")


class DocumentChunk(BaseModel):
    chunk_id: str
    content: str
    metadata: ChunkMetadata
