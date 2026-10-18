"""
supabase_sync.py
Responsibility: Synchronization helper for Supabase cloud storage & database.
Provides dual-mode metadata persistence (Supabase Cloud PostgreSQL + Local JSON fallback).
Handles:
  - Document Vault metadata sync with multi-tenant user_id & is_global isolation
  - Saved Question Bank sync (question_bank)
  - Exam & Answer History sync (exam_history)
  - Token verification via get_user_from_token
"""
import os
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

    supabase_url = (getattr(settings, "SUPABASE_URL", "") or os.getenv("SUPABASE_URL", "")).strip()
    supabase_key = (
        getattr(settings, "SUPABASE_KEY", "")
        or getattr(settings, "SUPABASE_SERVICE_KEY", "")
        or getattr(settings, "SUPABASE_ANON_KEY", "")
        or os.getenv("SUPABASE_KEY", "")
        or os.getenv("SUPABASE_SERVICE_KEY", "")
        or os.getenv("SUPABASE_ANON_KEY", "")
    ).strip()

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


def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validates a Supabase JWT access token and retrieves the authenticated user details.
    Returns dict with 'id' and 'email' or None if invalid.
    """
    if not token:
        return None
    client = get_supabase_client()
    if not client:
        return None

    try:
        # Strip Bearer prefix if provided
        clean_token = token.replace("Bearer ", "").strip()
        user_res = client.auth.get_user(clean_token)
        if user_res and user_res.user:
            return {
                "id": str(user_res.user.id),
                "email": getattr(user_res.user, "email", "")
            }
    except Exception as e:
        logger.debug(f"[SUPABASE AUTH] Token validation failed: {e}")
    return None


def sync_vault_metadata_to_supabase(vault_meta: Dict[str, Dict]) -> bool:
    """Syncs vault metadata dictionary to Supabase 'vault_metadata' table with user_id & is_global."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        records = []
        for filename, data in vault_meta.items():
            records.append({
                "filename": filename,
                "pinned": data.get("pinned", False),
                "uploaded_at": data.get("uploaded_at", ""),
                "subject": data.get("subject", "General"),
                "module": data.get("module", "Module 1"),
                "size_bytes": data.get("size_bytes", 0),
                "user_id": data.get("user_id"),
                "is_global": data.get("is_global", False)
            })

        if records:
            client.table("vault_metadata").upsert(records).execute()
            logger.info(f"✨ [SUPABASE] Synced {len(records)} vault metadata records to cloud.")
        return True
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Vault metadata sync failed: {e}")
        return False


def load_vault_metadata_from_supabase(user_id: Optional[str] = None) -> Optional[Dict[str, Dict]]:
    """
    Loads vault metadata from Supabase 'vault_metadata' table.
    If user_id is provided, fetches only records where user_id matches OR is_global is true.
    """
    client = get_supabase_client()
    if not client:
        return None

    try:
        query = client.table("vault_metadata").select("*")
        if user_id:
            query = query.or_(f"user_id.eq.{user_id},is_global.eq.true")
        response = query.execute()

        if response and response.data:
            meta = {}
            for item in response.data:
                fn = item.get("filename")
                if fn:
                    meta[fn] = {
                        "pinned": item.get("pinned", False),
                        "uploaded_at": item.get("uploaded_at", ""),
                        "subject": item.get("subject", "General"),
                        "module": item.get("module", "Module 1"),
                        "size_bytes": item.get("size_bytes", 0),
                        "user_id": item.get("user_id"),
                        "is_global": item.get("is_global", False)
                    }
            logger.info(f"✨ [SUPABASE] Loaded {len(meta)} vault metadata records from cloud (user: {user_id or 'all'}).")
            return meta
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Failed to load vault metadata from cloud: {e}")
    return None


def sync_question_bank_to_supabase(bank_items: List[Dict], user_id: Optional[str] = None) -> bool:
    """Syncs saved questions to Supabase 'question_bank' table with user_id."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        if bank_items:
            records = []
            for item in bank_items:
                rec = dict(item)
                if user_id and not rec.get("user_id"):
                    rec["user_id"] = user_id
                records.append(rec)
            client.table("question_bank").upsert(records).execute()
            logger.info(f"✨ [SUPABASE] Synced {len(records)} question bank items to cloud.")
        return True
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Question bank sync failed: {e}")
        return False


def load_question_bank_from_supabase(user_id: Optional[str] = None) -> Optional[List[Dict]]:
    """Loads saved question bank items from Supabase 'question_bank' table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        query = client.table("question_bank").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.execute()
        if response and response.data:
            logger.info(f"✨ [SUPABASE] Loaded {len(response.data)} question bank items from cloud.")
            return response.data
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Failed to load question bank from cloud: {e}")
    return None


def sync_exam_history_to_supabase(history_items: List[Dict], user_id: Optional[str] = None) -> bool:
    """Syncs answer history items to Supabase 'exam_history' table with user_id."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        if history_items:
            records = []
            for item in history_items:
                rec = {
                    "id": str(item.get("id") or item.get("created_at") or hash(item.get("question", ""))),
                    "question": item.get("question", ""),
                    "marks": item.get("marks", 5),
                    "subject": item.get("subject", "General"),
                    "module": item.get("module", "Module 1"),
                    "answer": item.get("answer", ""),
                    "sources": item.get("sources", []),
                    "user_id": item.get("user_id") or user_id
                }
                records.append(rec)
            client.table("exam_history").upsert(records).execute()
            logger.info(f"✨ [SUPABASE] Synced {len(records)} exam history records to cloud.")
        return True
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Exam history sync failed: {e}")
        return False


def load_exam_history_from_supabase(user_id: Optional[str] = None) -> Optional[List[Dict]]:
    """Loads exam history items from Supabase 'exam_history' table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        query = client.table("exam_history").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.order("created_at", desc=True).limit(100).execute()
        if response and response.data:
            logger.info(f"✨ [SUPABASE] Loaded {len(response.data)} exam history records from cloud.")
            return response.data
    except Exception as e:
        logger.warning(f"⚠️ [SUPABASE] Failed to load exam history from cloud: {e}")
    return None
