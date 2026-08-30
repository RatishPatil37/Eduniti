"""
ingest.py
Loads raw .txt documents and splits them into overlapping chunks
suitable for embedding and retrieval.

Chunking strategy: split on blank-line-separated paragraphs (since our
FAQ/policy docs are naturally structured as Q/A or topic blocks), then
merge short paragraphs up to a target size and add a small overlap so
context isn't lost at chunk boundaries.
"""

import os
import re
import json
from dataclasses import dataclass, asdict
from typing import List

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
CHUNKS_PATH = os.path.join(os.path.dirname(__file__), "..", "index", "chunks.json")

TARGET_CHUNK_CHARS = 600   # roughly 100-150 words per chunk
OVERLAP_CHARS = 100


@dataclass
class Chunk:
    chunk_id: str
    source: str
    text: str


def load_documents(raw_dir: str = RAW_DIR) -> List[tuple]:
    """Returns list of (filename, full_text)."""
    docs = []
    for fname in sorted(os.listdir(raw_dir)):
        if fname.endswith(".txt"):
            path = os.path.join(raw_dir, fname)
            with open(path, "r", encoding="utf-8") as f:
                docs.append((fname, f.read()))
    return docs


def split_into_paragraphs(text: str) -> List[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    return paras


def merge_paragraphs_to_chunks(paragraphs: List[str],
                                target_chars: int = TARGET_CHUNK_CHARS,
                                overlap_chars: int = OVERLAP_CHARS) -> List[str]:
    """Greedily merge paragraphs until we hit target size, carrying a
    small overlap from the end of the previous chunk into the next one."""
    chunks = []
    current = ""
    for para in paragraphs:
        if not current:
            current = para
        elif len(current) + 2 + len(para) <= target_chars:
            current += "\n\n" + para
        else:
            chunks.append(current)
            tail = current[-overlap_chars:] if overlap_chars else ""
            current = (tail + "\n\n" + para).strip()
    if current:
        chunks.append(current)
    return chunks


def build_chunks(raw_dir: str = RAW_DIR) -> List[Chunk]:
    docs = load_documents(raw_dir)
    all_chunks = []
    for fname, text in docs:
        paras = split_into_paragraphs(text)
        merged = merge_paragraphs_to_chunks(paras)
        for i, chunk_text in enumerate(merged):
            all_chunks.append(Chunk(
                chunk_id=f"{fname}::chunk{i}",
                source=fname,
                text=chunk_text,
            ))
    return all_chunks


def main():
    chunks = build_chunks()
    os.makedirs(os.path.dirname(CHUNKS_PATH), exist_ok=True)
    with open(CHUNKS_PATH, "w", encoding="utf-8") as f:
        json.dump([asdict(c) for c in chunks], f, indent=2)
    print(f"Loaded {len(chunks)} chunks from {RAW_DIR}")
    for c in chunks[:3]:
        print(f"  [{c.chunk_id}] {c.text[:80]}...")


if __name__ == "__main__":
    main()
