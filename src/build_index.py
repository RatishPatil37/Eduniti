"""
build_index.py
Embeds each chunk with a sentence-transformers model and builds a
FAISS index for fast nearest-neighbor retrieval. Saves the index plus
a parallel metadata file so retrieved vector IDs can be mapped back to
their source text.
"""

import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

from ingest import build_chunks, CHUNKS_PATH

INDEX_DIR = os.path.join(os.path.dirname(__file__), "..", "index")
FAISS_PATH = os.path.join(INDEX_DIR, "faiss.index")
META_PATH = os.path.join(INDEX_DIR, "metadata.json")

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"  # small, fast, strong baseline (384-dim)


def build_and_save_index():
    chunks = build_chunks()
    if not chunks:
        raise RuntimeError("No chunks found — check data/raw/ for .txt files.")

    print(f"Embedding {len(chunks)} chunks with {EMBED_MODEL_NAME} ...")
    model = SentenceTransformer(EMBED_MODEL_NAME)
    texts = [c.text for c in chunks]
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)

    # Normalize so inner product == cosine similarity
    faiss.normalize_L2(embeddings)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings.astype(np.float32))

    os.makedirs(INDEX_DIR, exist_ok=True)
    faiss.write_index(index, FAISS_PATH)

    metadata = [{"chunk_id": c.chunk_id, "source": c.source, "text": c.text} for c in chunks]
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved FAISS index ({index.ntotal} vectors, dim={dim}) -> {FAISS_PATH}")
    print(f"Saved metadata -> {META_PATH}")


if __name__ == "__main__":
    build_and_save_index()
