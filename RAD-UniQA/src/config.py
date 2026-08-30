import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM Provider: "auto" | "gemini" | "groq" | "ollama"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "auto")
    
    # Ollama Local Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1:8b-instruct-q5_K_M")
    
    # Gemini API Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
    GEMINI_FAST_MODEL: str = os.getenv("GEMINI_FAST_MODEL", "gemini-3.5-flash-lite")
    GEMINI_EMBED_MODEL: str = os.getenv("GEMINI_EMBED_MODEL", "models/gemini-embedding-2")
    
    # Groq API Configuration
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    # Active model fallback string (used in health endpoint)
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama3.1:8b-instruct-q5_K_M")
    
    # Embedding config
    EMBED_PROVIDER: str = os.getenv("EMBED_PROVIDER", "gemini")
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
    # Reranker disabled — using lightweight RRF sort instead (~2ms vs 3-8s cross-encoder)
    RERANKER_MODEL: str = os.getenv("RERANKER_MODEL", "disabled")
    
    # Qdrant Database
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_COLLECTION: str = "rad_uniqa"
    
    # Chunking & Retrieval Parameters (optimized for speed)
    PARENT_CHUNK_SIZE: int = 1000
    CHILD_CHUNK_SIZE: int = 250
    TOP_K_CANDIDATES: int = 12   # Reduced from 20 (less candidates = faster pipeline)
    TOP_K_FINAL: int = 5          # Increased from 4 (better quality with lightweight reranker)
    
    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    RAW_DOCS_DIR: Path = BASE_DIR / "docs" / "raw_documents"
    PROCESSED_DIR: Path = BASE_DIR / "docs" / "processed_chunks"
    BM25_CORPUS_PATH: Path = PROCESSED_DIR / "bm25_corpus.json"
    PARENT_STORE_PATH: Path = PROCESSED_DIR / "parent_store.json"
    
    # Vault, History & Question Bank Persistence Paths
    VAULT_METADATA_PATH: Path = PROCESSED_DIR / "vault_metadata.json"
    QUESTION_BANK_PATH: Path = PROCESSED_DIR / "question_bank.json"

    # Supabase Auth & Database
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
