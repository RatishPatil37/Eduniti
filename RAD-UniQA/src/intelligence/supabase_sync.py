"""
supabase_sync.py
Responsibility: Synchronization helper for Supabase cloud storage & database.
Provides dual-mode metadata persistence (Supabase Cloud PostgreSQL + Local JSON fallback).
Handles:
  - Document Vault metadata sync (vault_metadata)
  - Saved Question Bank sync (question_bank)
  - Exam History sync (exam_history)
"""
import logging
from typing import Dict, List, Any, Optional
from src.config import settings

logger = logging.getLogger(__name__)

_supabase_client = None

def get_supabase_client():
    """Lazy initializer for Supabase client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = settings.SUPABASE_URL.strip() if settings.SUPABASE_URL else ""
    supabase_key = (
        settings.SUPABASE_SERVICE_KEY.strip()
        or settings.SUPABASE_ANON_KEY.strip()
        if hasattr(settings, "SUPABASE_ANON_KEY")
        else ""
    )

    if not supabase_url or not supabase_key:
        logger.info("ℹ️ [SUPABASE] Cloud URL or Key not set. Using Local JSON persistence mode.")
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info(f"✨ [SUPABASE] Connected to Cloud Project: {supabase_url}")
        return _supabase_client
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Client initialization failed: {e}. Falling back to Local JSON mode.")
        return None


def sync_vault_metadata_to_supabase(vault_meta: Dict[str, Dict]) -> bool:
    """Syncs vault metadata dictionary to Supabase 'vault_metadata' table."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        # Prepare records: filename -> record
        records = []
        for filename, data in vault_meta.items():
            records.append({
                "filename": filename,
                "pinned": data.get("pinned", False),
                "uploaded_at": data.get("uploaded_at", ""),
                "subject": data.get("subject", "General"),
                "module": data.get("module", "Module 1"),
                "size_bytes": data.get("size_bytes", 0)
            })

        if records:
            # Upsert into vault_metadata table
            client.table("vault_metadata").upsert(records).execute()
            logger.info(f"✨ [SUPABASE] Synced {len(records)} vault metadata records to cloud.")
        return True
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Vault metadata sync failed: {e}")
        return False


def load_vault_metadata_from_supabase() -> Optional[Dict[str, Dict]]:
    """Loads vault metadata dictionary from Supabase 'vault_metadata' table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        response = client.table("vault_metadata").select("*").execute()
        if response.data:
            meta = {}
            for item in response.data:
                fn = item.get("filename")
                if fn:
                    meta[fn] = {
                        "pinned": item.get("pinned", False),
                        "uploaded_at": item.get("uploaded_at", ""),
                        "subject": item.get("subject", "General"),
                        "module": item.get("module", "Module 1"),
                        "size_bytes": item.get("size_bytes", 0)
                    }
            logger.info(f"✨ [SUPABASE] Loaded {len(meta)} vault metadata records from cloud.")
            return meta
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Failed to load vault metadata from cloud: {e}")
    return None


def sync_question_bank_to_supabase(bank_items: List[Dict]) -> bool:
    """Syncs saved questions to Supabase 'question_bank' table."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        if bank_items:
            client.table("question_bank").upsert(bank_items).execute()
            logger.info(f"✨ [SUPABASE] Synced {len(bank_items)} question bank items to cloud.")
        return True
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Question bank sync failed: {e}")
        return False


def load_question_bank_from_supabase() -> Optional[List[Dict]]:
    """Loads saved question bank items from Supabase 'question_bank' table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        response = client.table("question_bank").select("*").execute()
        if response.data:
            logger.info(f"✨ [SUPABASE] Loaded {len(response.data)} question bank items from cloud.")
            return response.data
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Failed to load question bank from cloud: {e}")
    return None
