"""
test_retrieval.py
Unit tests for Reciprocal Rank Fusion (RRF) algorithm and deduplication.
"""
from src.retriever.hybrid_search import compute_rrf_scores


def test_compute_rrf_scores():
    dense_results = [
        {"chunk_id": "doc1", "content": "Attention is all you need", "score": 0.95},
        {"chunk_id": "doc2", "content": "RNNs and LSTMs", "score": 0.88},
    ]
    sparse_results = [
        {"chunk_id": "doc2", "content": "RNNs and LSTMs", "score": 12.4},
        {"chunk_id": "doc3", "content": "Transformer architecture", "score": 10.1},
    ]

    fused = compute_rrf_scores(dense_results, sparse_results)
    
    # Check deduplication
    chunk_ids = [item["chunk_id"] for item in fused]
    assert len(chunk_ids) == len(set(chunk_ids)), "Duplicate chunk IDs found in RRF fusion!"
    assert set(chunk_ids) == {"doc1", "doc2", "doc3"}
    
    # Doc2 was in both dense and sparse, so its RRF score should be highest
    assert fused[0]["chunk_id"] == "doc2"
    assert fused[0]["rrf_score"] > fused[1]["rrf_score"]
