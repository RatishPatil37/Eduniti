"""
vector_store.py
Responsibility: Manage Qdrant collection setup, dense vector indexing, and payload management.
Handles auto-fallback to embedded local disk storage if Qdrant Docker server (port 6333) is offline.
"""
import os
import socket
import logging
from urllib.parse import urlparse
from typing import List, Dict, Any, Optional
from qdrant_client import AsyncQdrantClient, QdrantClient, models
from langchain_core.documents import Document
from src.config import settings

logger = logging.getLogger(__name__)


def _is_server_reachable(url: str, default_port: int = 6333, timeout: float = 0.5) -> bool:
    """Fast socket check to see if Qdrant server is reachable."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "localhost"
        port = parsed.port or default_port
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def get_qdrant_client() -> AsyncQdrantClient:
    """
    Creates an AsyncQdrantClient supporting both Qdrant Cloud and local embedded disk mode.
    If QDRANT_URL is set (e.g. cloud or custom host) and optional QDRANT_API_KEY is present,
    connects securely to the Qdrant Cloud server.
    Otherwise, seamlessly falls back to embedded local disk storage in ./qdrant_storage.
    """
    qdrant_url = settings.QDRANT_URL.strip() if settings.QDRANT_URL else ""
    api_key = settings.QDRANT_API_KEY.strip() if getattr(settings, "QDRANT_API_KEY", "") else None
    local_path = str(settings.BASE_DIR / "qdrant_storage")
    os.makedirs(local_path, exist_ok=True)

    if not qdrant_url or qdrant_url == "local":
        logger.info(f"✨ [QDRANT] Mode: Embedded Local Disk Storage ({local_path})")
        return AsyncQdrantClient(path=local_path)

    # Check if this is a localhost endpoint vs a remote cloud endpoint
    if "localhost" in qdrant_url or "127.0.0.1" in qdrant_url:
        if _is_server_reachable(qdrant_url):
            logger.info(f"✨ [QDRANT] Connected to local Docker instance at {qdrant_url}")
            return AsyncQdrantClient(url=qdrant_url, api_key=api_key)
        else:
            logger.info(f"✨ [QDRANT] Local Docker offline. Using embedded disk storage ({local_path})")
            return AsyncQdrantClient(path=local_path)

    # Remote Qdrant Cloud Cluster
    logger.info(f"✨ [QDRANT] Connected to Cloud Cluster ({qdrant_url})")
    return AsyncQdrantClient(url=qdrant_url, api_key=api_key, timeout=10.0)


async def setup_collection(client: AsyncQdrantClient, vector_size: int = 768) -> None:
    """
    Creates or recreates the Qdrant collection configured for dense vectors.
    If the collection exists with a different vector size, it safely recreates it.
    """
    try:
        collections = await client.get_collections()
        exists = any(c.name == settings.QDRANT_COLLECTION for c in collections.collections)
    except Exception:
        exists = False

    if exists:
        try:
            col_info = await client.get_collection(settings.QDRANT_COLLECTION)
            existing_size = None
            if col_info.config and col_info.config.params and col_info.config.params.vectors:
                vectors_cfg = col_info.config.params.vectors
                if isinstance(vectors_cfg, dict) and "dense" in vectors_cfg:
                    existing_size = getattr(vectors_cfg["dense"], "size", None)
                elif hasattr(vectors_cfg, "size"):
                    existing_size = vectors_cfg.size

            if existing_size and existing_size != vector_size:
                logger.info(f"Vector size changed ({existing_size} -> {vector_size}). Recreating collection '{settings.QDRANT_COLLECTION}'...")
                await client.delete_collection(settings.QDRANT_COLLECTION)
                exists = False
        except Exception:
            pass

    if not exists:
        await client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config={
                "dense": models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            }
        )


async def upsert_child_chunks(
    client: AsyncQdrantClient,
    children: List[Document],
    embedder: Any,
    batch_size: int = 32
) -> None:
    """
    Encodes child chunks using EmbedderClient and upserts them into Qdrant with rich payload.
    Safely handles both native Python lists and NumPy arrays.
    """
    if not children:
        return

    texts = [doc.page_content for doc in children]
    embeddings = embedder.encode(texts, normalize_embeddings=True)

    points = []
    for doc, emb in zip(children, embeddings):
        point_id = doc.metadata.get("chunk_id")
        vec = emb.tolist() if hasattr(emb, "tolist") else list(emb)
        points.append(
            models.PointStruct(
                id=point_id,
                vector={"dense": vec},
                payload={
                    "content": doc.page_content,
                    **doc.metadata
                }
            )
        )

    # Upsert in batches
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        await client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=batch
        )
