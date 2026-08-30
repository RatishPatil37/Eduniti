"""
reranker.py
Responsibility: Precision re-scoring using BAAI/bge-reranker-v2-m3 Cross-Encoder.
Re-ranks top candidate child chunks and resolves parent context blocks.
"""
from typing import List, Dict, Any, Optional
from src.config import settings

_reranker: Optional[Any] = None


def get_reranker() -> Any:
    """Lazy loader for the CrossEncoder model."""
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        _reranker = CrossEncoder(settings.RERANKER_MODEL)
    return _reranker


def rerank_and_select(
    query: str,
    candidates: List[Dict[str, Any]],
    top_k: int = 4
) -> List[Dict[str, Any]]:
    """
    Evaluates (query, text) pairs with the Cross-Encoder and returns the top_k most relevant chunks.
    """
    if not candidates:
        return []
        
    reranker = get_reranker()
    pairs = [[query, c["content"]] for c in candidates]
    scores = reranker.predict(pairs)
    
    reranked = sorted(
        zip(candidates, scores),
        key=lambda x: x[1],
        reverse=True
    )
    
    results = []
    for chunk, score in reranked[:top_k]:
        chunk["reranker_score"] = float(score)
        results.append(chunk)
        
    return results


def fetch_parent_chunks(
    top_children: List[Dict[str, Any]],
    parent_store: Dict[str, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Resolves the parent chunks corresponding to selected top child chunks.
    Deduplicates to prevent repeated context passages.
    """
    seen_parent_ids = set()
    parents = []
    
    for child in top_children:
        parent_id = child.get("metadata", {}).get("parent_chunk_id")
        if parent_id and parent_id not in seen_parent_ids:
            seen_parent_ids.add(parent_id)
            if parent_id in parent_store:
                parents.append(parent_store[parent_id])
                
    # Fallback to child chunks if parent mapping is unavailable
    if not parents:
        return top_children
        
    return parents
