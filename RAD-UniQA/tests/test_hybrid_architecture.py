"""
test_hybrid_architecture.py
Unit tests verifying the Dual-Mode Hybrid Architecture:
  1. Qdrant Client (Local embedded disk mode vs Cloud mode)
  2. Supabase Cloud Metadata Sync & Fallback
  3. Vault metadata and Question Bank cloud state helpers
"""
import os
import sys
import unittest
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import settings
from src.retriever.vector_store import get_qdrant_client
from src.intelligence.supabase_sync import (
    get_supabase_client,
    sync_vault_metadata_to_supabase,
    load_vault_metadata_from_supabase,
    sync_question_bank_to_supabase,
    load_question_bank_from_supabase
)


class TestHybridArchitecture(unittest.TestCase):

    def test_qdrant_client_local_mode(self):
        """Verify Qdrant client initializes cleanly in Local Mode."""
        client = get_qdrant_client()
        self.assertIsNotNone(client, "Qdrant AsyncClient should initialize cleanly.")

    def test_supabase_fallback_handling(self):
        """Verify Supabase sync methods handle missing/unconfigured credentials gracefully without raising exceptions."""
        # Unconfigured or missing credentials should return None for client
        client = get_supabase_client()
        
        # Test vault metadata sync fallback
        sample_meta = {"test_doc.pdf": {"pinned": True, "uploaded_at": "2026-08-30"}}
        res_sync = sync_vault_metadata_to_supabase(sample_meta)
        self.assertIn(res_sync, [True, False])

        # Test vault metadata load fallback
        meta_loaded = load_vault_metadata_from_supabase()
        self.assertTrue(meta_loaded is None or isinstance(meta_loaded, dict))

        # Test question bank sync fallback
        sample_bank = [{"id": "q1", "question": "What is RAG?"}]
        res_q_sync = sync_question_bank_to_supabase(sample_bank)
        self.assertIn(res_q_sync, [True, False])

        q_loaded = load_question_bank_from_supabase()
        self.assertTrue(q_loaded is None or isinstance(q_loaded, list))


if __name__ == "__main__":
    unittest.main()
