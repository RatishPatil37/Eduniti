import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import asyncio
import json
from src.config import settings
from src.retriever.vector_store import get_qdrant_client
from src.retriever.embedder import EmbedderClient
from src.generator.rag_chain import answer_question
from rank_bm25 import BM25Okapi

async def main():
    embedder = EmbedderClient()
    client = get_qdrant_client()
    
    with open(settings.BM25_CORPUS_PATH, 'r', encoding='utf-8') as f:
        bm25_corpus = json.load(f)
    tokenized = [[t.lower() for t in c['content'].split()] for c in bm25_corpus]
    bm25 = BM25Okapi(tokenized) if tokenized else None
    
    with open(settings.PARENT_STORE_PATH, 'r', encoding='utf-8') as f:
        parent_store = json.load(f)
        
    print('Testing query for: what is deep learning (subject=NLP, testing automatic fallback)...')
    res = await answer_question(
        question='what is deep learning',
        target_marks=5,
        subject='NLP',
        module_filter=None,
        client=client,
        embedder=embedder,
        bm25=bm25,
        bm25_corpus=bm25_corpus,
        parent_store=parent_store
    )
    print('\n[FINAL SYNTHESIZED ANSWER PREVIEW]:')
    print(res['generated_answer'][:600])
    print('\n[CITATIONS]:')
    for c in res['citations']:
        print(f"  - {c['source']} (Page {c['page_number']})")

if __name__ == '__main__':
    asyncio.run(main())
