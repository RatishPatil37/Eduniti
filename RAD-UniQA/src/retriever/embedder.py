"""
embedder.py
Responsibility: Unified embedding client with Gemini-first priority and local fallback.
Optimization: Batch Gemini API calls (one round-trip for all chunks vs serial per-item calls).
Reduces 200-400 serial API calls to 1-4 batched calls for a 50-page PDF.
"""
from __future__ import annotations

import sys
import math
import logging
from typing import List, Optional
from src.config import settings

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

logger = logging.getLogger(__name__)

GEMINI_BATCH_SIZE = 100  # Max items per batch API call


def _normalize_gemini_embed_model(model_name: str) -> str:
    """Normalizes user model strings to the exact string expected by the google.generativeai REST API."""
    name = (model_name or "").strip()
    if name.lower() in ("gemini-embedding-2", "google-embedding-2", "embedding-2", "gemini-2", "models/gemini-embedding-2"):
        return "models/gemini-embedding-2"
    if name.lower() in ("gemini-embedding-2-preview", "models/gemini-embedding-2-preview"):
        return "models/gemini-embedding-2-preview"
    if name.lower() in ("gemini-embedding-001", "models/gemini-embedding-001"):
        return "models/gemini-embedding-001"
    if not name.startswith("models/"):
        return f"models/{name}"
    return name


class EmbedderClient:
    """
    Unified embedding client. Tries Gemini Embedding 2 first (batched API calls to Google).
    Falls back to all-MiniLM-L6-v2 if GEMINI_API_KEY is missing or the API fails.
    """

    GEMINI_EMBED_DIM = 3072
    LOCAL_FALLBACK_MODEL = "all-MiniLM-L6-v2"
    LOCAL_FALLBACK_DIM = 384

    def __init__(self) -> None:
        self._provider: Optional[str] = None
        self._local_model = None
        self._gemini_client = None
        self._dim: Optional[int] = None

        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            self._provider = "gemini"
            self._dim = self.GEMINI_EMBED_DIM
            target_model = _normalize_gemini_embed_model(settings.GEMINI_EMBED_MODEL)
            print(f"✨ [EMBEDDER] Active Provider: GEMINI CLOUD API ({target_model}) | Dim: {self.GEMINI_EMBED_DIM} | Batch Size: {GEMINI_BATCH_SIZE}")
        else:
            self._provider = "local"
            self._dim = self.LOCAL_FALLBACK_DIM
            print(f"🖥️  [EMBEDDER] Active Provider: LOCAL FALLBACK ({self.LOCAL_FALLBACK_MODEL}) | Dim: {self.LOCAL_FALLBACK_DIM}")

    def encode(
        self,
        sentences: List[str],
        normalize_embeddings: bool = True,
        **kwargs
    ):
        """Encode a list of sentences into embedding vectors."""
        if self._provider == "gemini":
            try:
                return self._gemini_encode_batch(sentences, normalize_embeddings)
            except Exception as exc:
                print(f"⚠️  [EMBEDDER WARNING] Gemini API failed: {exc}. Switching to local {self.LOCAL_FALLBACK_MODEL}...")
                self._provider = "local"
                self._dim = self.LOCAL_FALLBACK_DIM

        return self._local_encode(sentences, normalize_embeddings)

    def get_sentence_embedding_dimension(self) -> int:
        """Returns the embedding dimension."""
        return self._dim or self.GEMINI_EMBED_DIM

    def _gemini_encode_batch(self, sentences: List[str], normalize: bool):
        """
        Calls Gemini Embedding API in batches of GEMINI_BATCH_SIZE.
        OPTIMIZED: Reduces N serial API calls to ceil(N/100) batched calls.
        """
        if self._gemini_client is None:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._gemini_client = genai

        model_name = _normalize_gemini_embed_model(settings.GEMINI_EMBED_MODEL)
        all_embeddings = []
        num_batches = math.ceil(len(sentences) / GEMINI_BATCH_SIZE)

        print(f"⚡ [EMBEDDER] Batching {len(sentences)} items into {num_batches} API call(s) using Gemini ({model_name})...")

        for batch_idx in range(num_batches):
            batch = sentences[batch_idx * GEMINI_BATCH_SIZE:(batch_idx + 1) * GEMINI_BATCH_SIZE]
            print(f"   📦 Batch {batch_idx + 1}/{num_batches}: {len(batch)} items...")

            # Use batch embedding if supported, else fall back to serial within batch
            try:
                # Try batch_embed_content (newer SDK versions)
                result = self._gemini_client.embed_content(
                    model=model_name,
                    content=batch,
                    task_type="retrieval_document"
                )
                # batch returns a list of embeddings
                embeddings_raw = result.get("embedding", result.get("embeddings", []))
                if isinstance(embeddings_raw[0], list):
                    batch_vecs = embeddings_raw
                else:
                    batch_vecs = [embeddings_raw]
            except Exception:
                # Fallback: serial within batch if batch call fails
                batch_vecs = []
                for text in batch:
                    r = self._gemini_client.embed_content(
                        model=model_name,
                        content=text,
                        task_type="retrieval_document"
                    )
                    batch_vecs.append(r["embedding"])

            if normalize:
                import numpy as np
                normalized = []
                for vec in batch_vecs:
                    arr = np.array(vec, dtype="float32")
                    norm = np.linalg.norm(arr)
                    normalized.append((arr / norm if norm > 0 else arr).tolist())
                all_embeddings.extend(normalized)
            else:
                all_embeddings.extend(batch_vecs)

        print(f"✅ [EMBEDDER] Generated {len(all_embeddings)} x {self.GEMINI_EMBED_DIM}-dim embeddings")
        return all_embeddings

    def _local_encode(self, sentences: List[str], normalize: bool):
        """Loads all-MiniLM-L6-v2 on first call and encodes locally."""
        if self._local_model is None:
            print(f"🖥️  [EMBEDDER] Loading local model {self.LOCAL_FALLBACK_MODEL} into memory...")
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer(self.LOCAL_FALLBACK_MODEL)
            self._dim = self.LOCAL_FALLBACK_DIM

        print(f"⚡ [EMBEDDER] Encoding {len(sentences)} items locally ({self.LOCAL_FALLBACK_MODEL})...")
        return self._local_model.encode(
            sentences,
            normalize_embeddings=normalize,
            convert_to_numpy=False
        )
