"""
hybrid_search.py
Responsibility: Parallel Dense Vector + BM25 Sparse Search fused using Reciprocal Rank Fusion (RRF).
Optimization: Dense and BM25 searches now run in parallel via asyncio.gather (~300-800ms saved).
Includes automatic graceful fallback to global corpus search if a strict subject filter yields 0 matches.
"""
import sys
import asyncio
from typing import List, Dict, Any, Optional
from qdrant_client import AsyncQdrantClient, models
from rank_bm25 import BM25Okapi
from src.config import settings

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

RRF_K = 60


def compute_rrf_scores(
    dense_results: List[Dict[str, Any]],
    sparse_results: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Combines dense and sparse rankings using Reciprocal Rank Fusion."""
    scores: Dict[str, float] = {}
    docs: Dict[str, Dict[str, Any]] = {}

    for rank, result in enumerate(dense_results):
        cid = result["chunk_id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (RRF_K + rank + 1)
        docs[cid] = result

    for rank, result in enumerate(sparse_results):
        cid = result["chunk_id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (RRF_K + rank + 1)
        if cid not in docs:
            docs[cid] = result

    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
    return [{"rrf_score": scores[cid], **docs[cid]} for cid in sorted_ids]


async def _dense_search(
    query: str,
    client: AsyncQdrantClient,
    embedder: Any,
    qdrant_filter: Any,
    top_k: int,
) -> List[Dict[str, Any]]:
    """Run dense vector search against Qdrant."""
    try:
        raw_emb = embedder.encode([query], normalize_embeddings=True)
        first_vec = raw_emb[0]
        query_emb = first_vec.tolist() if hasattr(first_vec, "tolist") else list(first_vec)

        res = await client.query_points(
            collection_name=settings.QDRANT_COLLECTION,
            query=query_emb,
            using="dense",
            query_filter=qdrant_filter,
            limit=top_k * 2
        )
        dense_hits = res.points if hasattr(res, "points") else (res or [])
        return [
            {
                "chunk_id": str(hit.id),
                "content": hit.payload.get("content", "") if hit.payload else "",
                "metadata": {k: v for k, v in hit.payload.items() if k != "content"} if hit.payload else {},
                "score": getattr(hit, "score", 0.0) or 0.0
            }
            for hit in dense_hits
        ]
    except Exception as e:
        print(f"⚠️  [DENSE SEARCH] Failed: {e}")
        return []


def _bm25_search(
    query: str,
    bm25: Optional[BM25Okapi],
    bm25_corpus: List[Dict[str, Any]],
    subject_filter: Optional[str],
    module_filter: Optional[int],
    top_k: int,
) -> List[Dict[str, Any]]:
    """Run BM25 sparse lexical search (sync, runs in thread via asyncio)."""
    if not bm25 or not bm25_corpus:
        return []

    tokenized_query = query.lower().split()
    bm25_scores = bm25.get_scores(tokenized_query)

    filtered_indices = []
    for idx, item in enumerate(bm25_corpus):
        meta = item.get("metadata", {})
        if subject_filter and subject_filter.lower() not in ("all", "all subjects", "general"):
            if meta.get("subject") != subject_filter:
                continue
        if module_filter and meta.get("module_number") != module_filter:
            continue
        filtered_indices.append(idx)

    top_indices = sorted(filtered_indices, key=lambda i: bm25_scores[i], reverse=True)[: top_k * 2]

    return [
        {
            "chunk_id": str(bm25_corpus[i]["chunk_id"]),
            "content": bm25_corpus[i]["content"],
            "metadata": bm25_corpus[i]["metadata"],
            "score": float(bm25_scores[i])
        }
        for i in top_indices
    ]


async def _run_single_search(
    query: str,
    client: AsyncQdrantClient,
    embedder: Any,
    bm25: Optional[BM25Okapi],
    bm25_corpus: List[Dict[str, Any]],
    subject_filter: Optional[str],
    module_filter: Optional[int],
    top_k: int
) -> List[Dict[str, Any]]:
    """
    Runs dense and BM25 searches in PARALLEL using asyncio.gather.
    Saves ~300-800ms versus sequential execution.
    """
    # Build Qdrant filter
    must_conditions = []
    if subject_filter and subject_filter.lower() not in ("all", "all subjects", "general"):
        must_conditions.append(
            models.FieldCondition(key="subject", match=models.MatchValue(value=subject_filter))
        )
    if module_filter:
        must_conditions.append(
            models.FieldCondition(key="module_number", match=models.MatchValue(value=module_filter))
        )
    qdrant_filter = models.Filter(must=must_conditions) if must_conditions else None

    # Run dense and BM25 in parallel
    dense_task = _dense_search(query, client, embedder, qdrant_filter, top_k)
    bm25_task = asyncio.get_event_loop().run_in_executor(
        None, _bm25_search, query, bm25, bm25_corpus, subject_filter, module_filter, top_k
    )

    dense_results, sparse_results = await asyncio.gather(dense_task, bm25_task)

    fused_candidates = compute_rrf_scores(dense_results, sparse_results)
    return fused_candidates[:top_k]


async def hybrid_search(
    query: str,
    client: AsyncQdrantClient,
    embedder: Any,
    bm25: Optional[BM25Okapi],
    bm25_corpus: List[Dict[str, Any]],
    subject_filter: Optional[str] = None,
    module_filter: Optional[int] = None,
    top_k: int = 20
) -> List[Dict[str, Any]]:
    """
    Executes parallel dense semantic search and sparse lexical search.
    If filtered search yields 0 candidates, automatically falls back to full-corpus search.
    """
    print(f"\n🔍 [HYBRID SEARCH] Query: \"{query}\" | Subject: {subject_filter or 'All'} | Module: {module_filter or 'All'}")

    candidates = await _run_single_search(
        query=query, client=client, embedder=embedder,
        bm25=bm25, bm25_corpus=bm25_corpus,
        subject_filter=subject_filter, module_filter=module_filter, top_k=top_k
    )

    # Graceful fallback if filtered search found nothing
    if not candidates and (subject_filter or module_filter):
        print(f"🔄 [HYBRID SEARCH] 0 candidates for '{subject_filter}'. Falling back to ALL subjects...")
        candidates = await _run_single_search(
            query=query, client=client, embedder=embedder,
            bm25=bm25, bm25_corpus=bm25_corpus,
            subject_filter=None, module_filter=None, top_k=top_k
        )

    print(f"📊 [HYBRID SEARCH] Retrieved {len(candidates)} fused candidates (parallel Dense + BM25)")
    return candidates
