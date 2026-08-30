from .prompts import build_prompt, SYSTEM_PROMPT_TEMPLATE, MARK_INSTRUCTIONS
from .llm_router import get_llm_instance, resolve_optimal_provider, get_ordered_llm_candidates

def answer_question(*args, **kwargs):
    from .rag_chain import answer_question as _aq
    return _aq(*args, **kwargs)

__all__ = [
    "build_prompt",
    "SYSTEM_PROMPT_TEMPLATE",
    "MARK_INSTRUCTIONS",
    "answer_question",
    "get_llm_instance",
    "resolve_optimal_provider",
    "get_ordered_llm_candidates",
]
