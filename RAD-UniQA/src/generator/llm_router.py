"""
llm_router.py
Responsibility: Intelligent, task-aware LLM routing and automatic multi-tier fallback engine.

Strict Fallback Hierarchy:
  Tier 1: Gemini 3.7 Flash     (Primary for 10-mark & complex derivations)
  Tier 2: Gemini 3.5 Flash     (Secondary high-reasoning Gemini fallback)
  Tier 3: Gemini 3.5 Flash Lite (High-throughput 15 RPM / 500 RPD fallback)
  Tier 4: Groq Llama 3.3 70B   (14.4K RPD free cloud fallback)
  Tier 5: Ollama Local         (Offline local fallback)
"""
import sys
import time
import logging
from typing import Literal, Tuple, Any, List, Dict, AsyncGenerator
from langchain_core.messages import HumanMessage
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

HIGH_COMPLEXITY_TASKS = {
    "long_derivation",
    "mock_exam_generation",
    "concept_graph",
    "diagram_generation",
}


def get_ordered_llm_candidates(
    task: TaskType = "general_qa",
    target_marks: int = 10
) -> List[Dict[str, Any]]:
    """
    Constructs an ordered chain of LLM candidates for automatic failover.
    Hierarchy:
      1. Gemini 3.7 Flash (Primary for 10m/complex) or Gemini 3.5 Flash Lite (for fast 2m)
      2. Gemini 3.5 Flash (Secondary fallback)
      3. Gemini 3.5 Flash Lite (High-throughput fallback)
      4. Groq Llama 3.3 70B (Cloud fallback)
      5. Ollama Llama 3.1 8B (Local offline fallback)
    """
    has_gemini = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    has_groq   = bool(settings.GROQ_API_KEY   and settings.GROQ_API_KEY.strip())
    is_complex = (task in HIGH_COMPLEXITY_TASKS) or (target_marks >= 10)

    candidates = []

    if has_gemini:
        if is_complex:
            # Complex: 3.7 Flash -> 3.5 Flash -> 3.5 Flash Lite
            candidates.append({"provider": "gemini", "model": settings.GEMINI_MODEL, "desc": "Gemini 3.7 Flash (Primary)"})
            candidates.append({"provider": "gemini", "model": settings.GEMINI_SECONDARY_MODEL, "desc": "Gemini 3.5 Flash (Secondary)"})
            candidates.append({"provider": "gemini", "model": settings.GEMINI_FAST_MODEL, "desc": "Gemini 3.5 Flash Lite (High-Throughput)"})
        else:
            # Fast: 3.5 Flash Lite -> 3.5 Flash -> 3.7 Flash
            candidates.append({"provider": "gemini", "model": settings.GEMINI_FAST_MODEL, "desc": "Gemini 3.5 Flash Lite (Fast Primary)"})
            candidates.append({"provider": "gemini", "model": settings.GEMINI_SECONDARY_MODEL, "desc": "Gemini 3.5 Flash (Secondary)"})
            candidates.append({"provider": "gemini", "model": settings.GEMINI_MODEL, "desc": "Gemini 3.7 Flash (High Reasoning)"})

    if has_groq:
        candidates.append({"provider": "groq", "model": settings.GROQ_MODEL, "desc": "Groq Llama 3.3 70B (Cloud Fallback)"})

    # Always append Ollama as final safety net
    candidates.append({"provider": "ollama", "model": settings.OLLAMA_MODEL, "desc": "Ollama Local (Offline Fallback)"})

    return candidates


def _create_llm_client(provider: str, model_name: str, temperature: float = 0.2) -> Any:
    """Instantiates a single LangChain LLM instance."""
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=temperature,
            convert_system_message_to_human=True
        )
    elif provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model_name,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=temperature
        )
    elif provider == "ollama":
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=temperature
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")


async def execute_with_failover(
    prompt: str,
    task: TaskType = "general_qa",
    target_marks: int = 10,
    temperature: float = 0.2
) -> Tuple[str, str, str]:
    """
    Executes an LLM call with automatic multi-tier failover.
    Returns: (generated_text, active_provider, active_model)
    """
    candidates = get_ordered_llm_candidates(task, target_marks)
    last_error = None

    for idx, c in enumerate(candidates):
        provider = c["provider"]
        model = c["model"]
        desc = c["desc"]
        try:
            print(f"🤖 [LLM ATTEMPT {idx + 1}/{len(candidates)}] Using {desc}...")
            llm = _create_llm_client(provider, model, temperature)
            response = await llm.ainvoke([HumanMessage(content=prompt)])

            raw_content = response.content
            if isinstance(raw_content, list):
                text_parts = []
                for part in raw_content:
                    if isinstance(part, str):
                        text_parts.append(part)
                    elif isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif hasattr(part, "text"):
                        text_parts.append(getattr(part, "text"))
                    else:
                        text_parts.append(str(part))
                answer_text = "".join(text_parts)
            else:
                answer_text = str(raw_content)

            if answer_text.strip():
                print(f"✅ [LLM SUCCESS] Completed generation via {desc} ({len(answer_text)} chars)")
                return answer_text, provider, model

        except Exception as e:
            error_str = str(e)
            print(f"⚠️  [LLM FAILOVER] {desc} failed: {error_str[:160]}...")
            last_error = e
            continue

    print(f"❌ [ALL LLMs FAILED] Last error: {last_error}")
    raise RuntimeError(f"All LLM tiers failed. Last error: {last_error}")


async def stream_with_failover(
    prompt: str,
    task: TaskType = "general_qa",
    target_marks: int = 10,
    temperature: float = 0.2
) -> AsyncGenerator[Tuple[str, str, str], None]:
    """
    Streams tokens with automatic failover to the next candidate if the active LLM fails.
    Yields tuples: (token_chunk, provider, model)
    """
    candidates = get_ordered_llm_candidates(task, target_marks)
    last_error = None

    for idx, c in enumerate(candidates):
        provider = c["provider"]
        model = c["model"]
        desc = c["desc"]
        try:
            print(f"🌊 [STREAM ATTEMPT {idx + 1}/{len(candidates)}] Using {desc}...")
            llm = _create_llm_client(provider, model, temperature)
            received_any_token = False

            async for chunk in llm.astream([HumanMessage(content=prompt)]):
                token = ""
                if hasattr(chunk, "content"):
                    raw = chunk.content
                    if isinstance(raw, str):
                        token = raw
                    elif isinstance(raw, list):
                        for part in raw:
                            if isinstance(part, str):
                                token += part
                            elif isinstance(part, dict) and "text" in part:
                                token += part["text"]
                if token:
                    received_any_token = True
                    yield (token, provider, model)

            if received_any_token:
                print(f"✅ [STREAM COMPLETE] Finished streaming via {desc}")
                return

        except Exception as e:
            error_str = str(e)
            print(f"⚠️  [STREAM FAILOVER] {desc} failed: {error_str[:160]}...")
            last_error = e
            continue

    raise RuntimeError(f"All LLM streaming tiers failed. Last error: {last_error}")


def resolve_optimal_provider(task: TaskType = "general_qa", target_marks: int = 10) -> Tuple[str, str]:
    """Returns top candidate provider and model name."""
    candidates = get_ordered_llm_candidates(task, target_marks)
    if candidates:
        return candidates[0]["provider"], candidates[0]["model"]
    return "gemini", settings.GEMINI_MODEL


def get_llm_instance(task: TaskType = "general_qa", target_marks: int = 10, temperature: float = 0.2) -> Tuple[Any, str, str]:
    """Returns the primary LLM instance."""
    candidates = get_ordered_llm_candidates(task, target_marks)
    top = candidates[0]
    llm = _create_llm_client(top["provider"], top["model"], temperature)
    return llm, top["provider"], top["model"]
