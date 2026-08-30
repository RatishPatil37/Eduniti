"""
llm_router.py
Responsibility: Intelligent, task-aware LLM routing and automatic fallback engine.

Routing Strategy for <=5 Users (Maximum Reasoning & Depth):
  10-mark / Complex Tasks (derivations, mock exams, concept graphs, diagrams):
    1. Gemini 2.5 Flash   - "gemini-3.7-flash" tier, best reasoning + diagram quality
    2. Groq Llama 3.3 70B - High-throughput fallback (14.4K RPD free)
    3. Ollama local       - Offline fallback (unlimited, no internet needed)

  2/5-mark / Fast Tasks (definitions, comparisons, quick Q&A):
    1. Gemini 2.0 Flash Lite - "gemini-3.5-flash-lite" tier, 30 RPM / 1500 RPD
    2. Groq Llama 3.3 70B    - Same model for consistency, ample free quota
    3. Ollama local          - Offline fallback

  Diagram/Architecture Questions (any marks):
    Always routed to the BEST available model (Gemini 2.5 Flash -> Groq 3.3 70B -> Ollama).
    These questions need the highest structural reasoning capability.
"""
import os
import sys
import logging
from typing import Literal, Tuple, Any, Optional
from src.config import settings

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

logger = logging.getLogger(__name__)

TaskType = Literal[
    "short_definition",     # 2-mark question
    "medium_comparison",    # 5-mark question
    "long_derivation",      # 10-mark question with LaTeX + step-by-step
    "diagram_generation",   # Any marks - requires diagram/flowchart markup
    "mock_exam_generation", # Full exam paper synthesis
    "concept_graph",        # Prerequisite extraction
    "practice_eval",        # Student answer grading
    "study_planner",        # Day-by-day scheduling
    "general_qa"            # Default query
]

# ===========================================================================
# Model Names (as used in the respective API)
# ===========================================================================
GEMINI_HIGH_MODEL = settings.GEMINI_MODEL       # gemini-3.7-flash (Best reasoning & derivations)
GEMINI_FAST_MODEL = settings.GEMINI_FAST_MODEL  # gemini-3.5-flash-lite (High-throughput & fast responses)
GROQ_MODEL_HIGH   = settings.GROQ_MODEL         # llama-3.3-70b-versatile
GROQ_MODEL_FAST   = settings.GROQ_MODEL         # llama-3.3-70b-versatile
OLLAMA_MODEL      = settings.OLLAMA_MODEL       # llama3:8b (Local)

# High-complexity task categories that benefit from deeper reasoning
HIGH_COMPLEXITY_TASKS = {
    "long_derivation",
    "mock_exam_generation",
    "concept_graph",
    "diagram_generation",
}


def resolve_optimal_provider(
    task: TaskType = "general_qa",
    target_marks: int = 10
) -> Tuple[str, str]:
    """
    Determines the best available LLM provider and model for the specific task.
    """
    has_gemini = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    has_groq   = bool(settings.GROQ_API_KEY   and settings.GROQ_API_KEY.strip())

    is_complex = (task in HIGH_COMPLEXITY_TASKS) or (target_marks >= 10)

    if has_gemini:
        model = GEMINI_HIGH_MODEL if is_complex else GEMINI_FAST_MODEL
        return "gemini", model

    if has_groq:
        model = GROQ_MODEL_HIGH if is_complex else GROQ_MODEL_FAST
        return "groq", model

    return "ollama", OLLAMA_MODEL


def get_llm_instance(
    task: TaskType = "general_qa",
    target_marks: int = 10,
    temperature: float = 0.2
) -> Tuple[Any, str, str]:
    """
    Instantiates and returns the LangChain chat model client with graceful fallback.
    """
    provider, model_name = resolve_optimal_provider(task, target_marks)

    # -----------------------------------------------------------------------
    # 1. Google Gemini (Cloud primary)
    # -----------------------------------------------------------------------
    if provider == "gemini":
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=temperature,
                convert_system_message_to_human=True
            )
            return llm, "gemini", model_name
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini ({model_name}): {e}. Attempting Groq fallback...")
            if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
                provider = "groq"
                model_name = GROQ_MODEL_HIGH if target_marks >= 10 else GROQ_MODEL_FAST
            else:
                provider = "ollama"
                model_name = OLLAMA_MODEL

    # -----------------------------------------------------------------------
    # 2. Groq Cloud (Secondary high-throughput fallback)
    # -----------------------------------------------------------------------
    if provider == "groq":
        try:
            from langchain_groq import ChatGroq
            llm = ChatGroq(
                model=model_name,
                groq_api_key=settings.GROQ_API_KEY,
                temperature=temperature
            )
            return llm, "groq", model_name
        except Exception as e:
            logger.warning(f"Failed to initialize Groq ({model_name}): {e}. Falling back to Ollama local...")
            provider = "ollama"
            model_name = OLLAMA_MODEL

    # -----------------------------------------------------------------------
    # 3. Ollama (Local offline fallback)
    # -----------------------------------------------------------------------
    try:
        from langchain_community.chat_models import ChatOllama
        llm = ChatOllama(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=temperature
        )
        return llm, "ollama", model_name
    except Exception as e:
        logger.error(f"All LLM providers failed (Gemini, Groq, Ollama): {e}")
        raise RuntimeError(
            "No functional LLM provider available. "
            "Please provide a valid GEMINI_API_KEY, GROQ_API_KEY, or run `ollama serve`."
        ) from e
