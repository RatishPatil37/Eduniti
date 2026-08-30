"""
index_documents.py
Responsibility: CLI tool to process raw PDF documents, create hierarchical Parent-Child chunks,
upsert child vectors into Qdrant, and save BM25 + Parent stores.

Usage:
  python scripts/index_documents.py --dir docs/raw_documents --subject NLP
"""
import os
import sys
import json
import argparse
import asyncio
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from qdrant_client import AsyncQdrantClient
from sentence_transformers import SentenceTransformer

from src.config import settings
from src.ingestion.pdf_parser import parse_pdf_to_markdown
from src.ingestion.metadata import extract_metadata_from_filename
from src.ingestion.chunker import create_parent_child_chunks
from src.retriever.vector_store import setup_collection, upsert_child_chunks


async def main():
    parser = argparse.ArgumentParser(description="Index university documents into RAD-UniQA.")
    parser.add_argument("--dir", type=str, default=str(settings.RAW_DOCS_DIR), help="Directory containing PDF files")
    parser.add_argument("--subject", type=str, default="NLP", help="Default subject name")
    args = parser.parse_args()
    
    docs_dir = Path(args.dir)
    if not docs_dir.exists():
        print(f"Error: Directory {docs_dir} does not exist.")
        return
        
    pdf_files = list(docs_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {docs_dir}.")
        return
        
    print(f"📄 Found {len(pdf_files)} PDF file(s) in {docs_dir}")
    
    settings.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    
    all_parents = []
    all_children = []
    parent_store = {}
    
    # 1. Parse and Chunk
    for pdf_file in pdf_files:
        print(f"  Parsing: {pdf_file.name}...")
        pages = parse_pdf_to_markdown(pdf_file)
        metadata = extract_metadata_from_filename(pdf_file.name, default_subject=args.subject)
        
        parents, children = create_parent_child_chunks(
            pages=pages,
            metadata=metadata,
            source_filename=pdf_file.name,
            parent_chunk_size=settings.PARENT_CHUNK_SIZE,
            child_chunk_size=settings.CHILD_CHUNK_SIZE
        )
        
        all_parents.extend(parents)
        all_children.extend(children)
        
        for p in parents:
            parent_store[p.metadata["chunk_id"]] = {
                "chunk_id": p.metadata["chunk_id"],
                "content": p.page_content,
                "metadata": p.metadata
            }
            
    print(f"\n📊 Extraction Summary:")
    print(f"  • Total Parent Chunks: {len(all_parents)}")
    print(f"  • Total Child Chunks: {len(all_children)}")
    
    # 2. Save BM25 Corpus & Parent Store to Disk
    bm25_corpus = [
        {
            "chunk_id": c.metadata["chunk_id"],
            "content": c.page_content,
            "metadata": c.metadata
        }
        for c in all_children
    ]
    
    with open(settings.BM25_CORPUS_PATH, "w", encoding="utf-8") as f:
        json.dump(bm25_corpus, f, indent=2)
    print(f"✓ Saved BM25 corpus to {settings.BM25_CORPUS_PATH}")
    
    with open(settings.PARENT_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(parent_store, f, indent=2)
    print(f"✓ Saved Parent Store to {settings.PARENT_STORE_PATH}")
    
    # 3. Embed and Index into Qdrant
    print("\n🧠 Connecting to Qdrant & generating embeddings...")
    from src.retriever.vector_store import get_qdrant_client
    from src.retriever.embedder import EmbedderClient
    client = get_qdrant_client()
    embedder = EmbedderClient()
    
    try:
        vector_dim = embedder.get_sentence_embedding_dimension()
        await setup_collection(client, vector_size=vector_dim)
        await upsert_child_chunks(client, all_children, embedder)
        print("✓ Vector indexing completed successfully in Qdrant!")
    except Exception as e:
        print(f"⚠️ Vector indexing failed: {e}")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
