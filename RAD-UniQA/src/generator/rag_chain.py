"""
rag_chain.py
Responsibility: Core multi-tier RAG orchestration with streaming support, LRU caching,
and ultra-resilient multi-tier LLM failover.
"""
import time
import json
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
from src.retriever.hybrid_search import hybrid_search
from src.generator.prompts import build_prompt
from src.generator.llm_router import execute_with_failover, stream_with_failover, resolve_optimal_provider
from src.config import settings

# In-memory query cache for instant replay (stores last 64 queries)
_QUERY_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_MAX_SIZE = 64


def _cache_key(question: str, marks: int, subject: Optional[str], module: Optional[int]) -> str:
    return f"{question.strip().lower()}__{marks}__{subject or 'all'}__{module or 'all'}"


def _fetch_parent_chunks(
    children: List[Dict[str, Any]],
    parent_store: Dict[str, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Retrieves full parent chunks associated with top child chunks."""
    seen_parent_ids = set()
    parent_contexts = []

    for child in children:
        meta = child.get("metadata", {})
        parent_id = meta.get("parent_id")

        if parent_id and parent_id not in seen_parent_ids:
            seen_parent_ids.add(parent_id)
            parent = parent_store.get(parent_id)
            if parent:
                parent_contexts.append(parent)
            else:
                parent_contexts.append(child)
        elif not parent_id:
            parent_contexts.append(child)

    return parent_contexts


def _lightweight_rerank(
    candidates: List[Dict[str, Any]],
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Ranks retrieved candidates by combined RRF score.
    Takes ~2ms instead of 3-8s on CPU cross-encoder.
    """
    sorted_candidates = sorted(
        candidates,
        key=lambda x: x.get("score", 0.0),
        reverse=True
    )
    return sorted_candidates[:top_k]


async def answer_question(
    question: str,
    target_marks: int,
    subject: Optional[str],
    module_filter: Optional[int],
    client: Any,
    embedder: Any,
    bm25: Any,
    bm25_corpus: List[Dict[str, Any]],
    parent_store: Dict[str, Dict[str, Any]],
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Primary synchronous RAG answer generator with resilient failover.
    """
    start_time = time.time()
    ckey = _cache_key(question, target_marks, subject, module_filter)

    if use_cache and ckey in _QUERY_CACHE:
        cached = _QUERY_CACHE[ckey]
        print(f"⚡ [CACHE HIT] Returning cached answer for \"{question[:40]}...\" (0ms)")
        return cached

    print(f"\n=======================================================")
    print(f"🎯 [RAG PIPELINE] Synthesizing {target_marks}-Mark Answer for: '{question}'")
    print(f"📌 [FILTERS] Subject: {subject or 'All'} | Module: {module_filter or 'All'}")

    # 1. Parallel Hybrid Search
    candidates = await hybrid_search(
        query=question,
        client=client,
        embedder=embedder,
        bm25=bm25,
        bm25_corpus=bm25_corpus,
        subject_filter=subject,
        module_filter=module_filter,
        top_k=settings.TOP_K_CANDIDATES
    )

    if not candidates:
        print(f"⚠️  [RAG PIPELINE] 0 relevant chunks found in knowledge base.")
        return {
            "question": question,
            "target_marks": target_marks,
            "generated_answer": "**Insufficient Document Context**: The provided university documentation does not contain enough verified material to synthesize a complete answer for this question under the current syllabus filters.",
            "citations": []
        }

    # 2. Lightweight rerank using RRF scores
    top_children = _lightweight_rerank(candidates, top_k=settings.TOP_K_FINAL)
    print(f"✅ [RERANKER] Selected top {len(top_children)} chunks (RRF sort)")

    # 3. Resolve parent contexts
    parent_contexts = _fetch_parent_chunks(top_children, parent_store)
    print(f"📚 [PARENT STORE] Hydrated {len(parent_contexts)} parent context blocks")

    # 4. Construct grounded prompt
    prompt = build_prompt(question, target_marks, parent_contexts)

    # 5. Task-Aware Dynamic Failover Execution
    task_type = "long_derivation" if target_marks >= 10 else ("medium_comparison" if target_marks >= 5 else "short_definition")
    
    gen_start = time.time()
    answer_text, active_provider, active_model = await execute_with_failover(
        prompt=prompt,
        task=task_type,
        target_marks=target_marks
    )
    gen_duration = round((time.time() - gen_start) * 1000)
    print(f"✨ [GENERATION] Generated {len(answer_text)} characters in {gen_duration}ms using {active_provider.upper()} ({active_model})")

    # 6. Extract structured citations
    citations = []
    seen_citations = set()
    for child in top_children:
        meta = child.get("metadata", {})
        source = meta.get("source", "Unknown Document")
        module_num = meta.get("module_number")
        page_num = meta.get("page_number")
        cite_key = (source, module_num, page_num)
        if cite_key not in seen_citations:
            seen_citations.add(cite_key)
            citations.append({
                "source": source,
                "module_number": module_num,
                "page_number": page_num,
                "snippet": child.get("content", "")[:120].strip() + "..."
            })

    total_elapsed = round((time.time() - start_time) * 1000)
    print(f"🏁 [RAG PIPELINE] Total execution time: {total_elapsed}ms | Citations: {len(citations)}")
    print(f"=======================================================\n")

    result = {
        "question": question,
        "target_marks": target_marks,
        "generated_answer": answer_text,
        "citations": citations,
        "provider": active_provider,
        "model": active_model
    }

    # Populate cache
    if len(_QUERY_CACHE) >= _CACHE_MAX_SIZE:
        _QUERY_CACHE.pop(next(iter(_QUERY_CACHE)))
    _QUERY_CACHE[ckey] = result

    return result


async def answer_question_stream(
    question: str,
    target_marks: int,
    subject: Optional[str],
    module_filter: Optional[int],
    client: Any,
    embedder: Any,
    bm25: Any,
    bm25_corpus: List[Dict[str, Any]],
    parent_store: Dict[str, Dict[str, Any]],
) -> AsyncGenerator[str, None]:
    """
    Streaming version of answer_question with automatic failover.
    Yields SSE-formatted chunks.
    """
    start_time = time.time()
    print(f"\n🌊 [STREAM PIPELINE] Starting streaming synthesis for {target_marks}-mark question")
    print(f"📝 [QUESTION] \"{question}\"")

    # 1. Retrieve candidates
    candidates = await hybrid_search(
        query=question,
        client=client,
        embedder=embedder,
        bm25=bm25,
        bm25_corpus=bm25_corpus,
        subject_filter=subject,
        module_filter=module_filter,
        top_k=settings.TOP_K_CANDIDATES
    )

    if not candidates:
        yield f"data: {json.dumps({'type': 'error', 'content': 'Insufficient document context. Please ingest relevant documents first.'})}\n\n"
        return

    # 2. Lightweight rerank
    top_children = _lightweight_rerank(candidates, top_k=settings.TOP_K_FINAL)
    parent_contexts = _fetch_parent_chunks(top_children, parent_store)

    # 3. Build prompt
    prompt = build_prompt(question, target_marks, parent_contexts)

    # 4. Extract citations
    citations = []
    seen_citations = set()
    for child in top_children:
        meta = child.get("metadata", {})
        source = meta.get("source", "Unknown Document")
        module_num = meta.get("module_number")
        page_num = meta.get("page_number")
        cite_key = (source, module_num, page_num)
        if cite_key not in seen_citations:
            seen_citations.add(cite_key)
            citations.append({
                "source": source,
                "module_number": module_num,
                "page_number": page_num,
                "snippet": child.get("content", "")[:120].strip() + "..."
            })

    # 5. Send initial metadata event
    task_type = "long_derivation" if target_marks >= 10 else ("medium_comparison" if target_marks >= 5 else "short_definition")
    top_provider, top_model = resolve_optimal_provider(task=task_type, target_marks=target_marks)
    yield f"data: {json.dumps({'type': 'meta', 'provider': top_provider, 'model': top_model, 'citations': citations})}\n\n"

    # 6. Stream tokens with failover
    full_text = ""
    gen_start = time.time()
    active_prov = top_provider
    active_mod = top_model

    try:
        async for (token, prov, mod) in stream_with_failover(prompt=prompt, task=task_type, target_marks=target_marks):
            active_prov = prov
            active_mod = mod
            full_text += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
    except Exception as e:
        print(f"❌ [STREAM] Error during streaming: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        return

    gen_duration = round((time.time() - gen_start) * 1000)
    total_elapsed = round((time.time() - start_time) * 1000)
    print(f"✨ [STREAM] Streamed {len(full_text)} chars in {gen_duration}ms via {active_prov.upper()} ({active_mod}) | Total: {total_elapsed}ms")

    yield f"data: {json.dumps({'type': 'done', 'total_chars': len(full_text), 'latency_ms': total_elapsed, 'provider': active_prov, 'model': active_mod})}\n\n"
