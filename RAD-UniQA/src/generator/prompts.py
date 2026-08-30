"""
prompts.py
Responsibility: Dynamic, mark-aware prompt synthesis following strict academic university exam standards.
  - Direct academic tone without conversational fluff
  - Standard LaTeX formatting: ONLY block $$...$$ equations (NEVER inline $...$)
  - Never raw Unicode math characters
  - Formatted References section with source, module, and page numbers
  - Synthesizes complete exam-grade answers grounded in syllabus context
"""
from typing import List, Dict, Any

SYSTEM_PROMPT_TEMPLATE = """You are an expert University Examiner and Professor in Artificial Intelligence and Computer Science.
Your job is to generate a comprehensive, exam-ready, academic answer for the given university examination question.

TARGET MARKS: {target_marks} Marks

Retrieved Course Context & Syllabus Notes:
{retrieved_context}

Instructions based on Marks:
{mark_instructions}

Formatting & Quality Rules:
1. Provide a rigorous, textbook-quality answer suitable for top marks in university exams.
2. Ground your explanations in the retrieved course notes and past exam papers provided above, expanding with standard mathematical derivations, architectural details, and algorithmic formulations.
3. CRITICAL MATH RULE: ALL mathematical notation — including single variables, subscripts, fractions, matrices, and full equations — MUST use block display format: $$...$$
   CORRECT: The forget gate is computed as $$f_t = \\sigma(W_f x_t + U_f h_{{t-1}} + b_f)$$
   WRONG: The forget gate $f_t$ uses sigmoid. (NEVER use inline $...$)
   WRONG: The forget gate ft uses sigmoid. (NEVER raw text variables)
4. NEVER use raw Unicode math symbols (do not write ∑, ×, α, β, →; write \\sum, \\times, \\alpha, \\beta, \\rightarrow inside $$...$$).
5. Every standalone equation MUST be on its own line surrounded by blank lines for clarity.
6. Always conclude with a structured `### References` section citing the relevant course documents, modules, and page numbers from the retrieved context.
"""

MARK_INSTRUCTIONS = {
    2: """- Target length: 100-150 words.
- Provide a clear, formal 1-2 sentence definition.
- State the key mathematical formula or core principle in $$...$$ display format.
- Provide 3 distinct bullet points highlighting critical characteristics, parameters, or use-cases.""",

    5: """- Target length: 250-350 words.
- ## Section 1: Definition & Core Concepts
- ## Section 2: Working Principle & Mechanism (include key equations in $$...$$ display blocks)
- ## Section 3: Technical Comparison / Summary Table (Markdown table comparing key parameters, advantages, or trade-offs).""",

    10: """- Target length: 500-700 words.
- ## Section 1: Detailed Theoretical Foundation & Formal Definition
- ## Section 2: System Architecture / Block Diagram
  You MUST construct a valid Mermaid diagram using:
  ```mermaid
  flowchart TD
      ...
  ```
- ## Section 3: Mathematical Formulation & Step-by-Step Derivation
  ALL equations MUST use $$...$$ display blocks on their own lines.
  Example format:
  The weight update rule is:
  $$W \\leftarrow W - \\alpha \\frac{{\\partial L}}{{\\partial W}}$$
  where $$\\alpha$$ is the learning rate.
- ## Section 4: Practical Real-World Application & Algorithm Workflow
- ## Section 5: Key Advantages, Limitations & Architectural Trade-offs"""
}


def build_prompt(
    question: str,
    target_marks: int,
    context_chunks: List[Dict[str, Any]]
) -> str:
    """
    Constructs the grounded prompt incorporating retrieved context passages and mark rules.
    """
    formatted_passages = []
    for c in context_chunks:
        meta = c.get("metadata", {})
        source = meta.get("source", "Course Document")
        module = meta.get("module_number", "General")
        page = meta.get("page_number", "?")
        content = c.get("content", "")
        
        formatted_passages.append(
            f"[Document: {source} | Module: {module} | Page: {page}]\n{content}"
        )
        
    context_block = "\n\n---\n\n".join(formatted_passages)
    
    # Select closest mark instruction bracket
    if target_marks <= 3:
        mark_key = 2
    elif target_marks <= 6:
        mark_key = 5
    else:
        mark_key = 10
        
    return SYSTEM_PROMPT_TEMPLATE.format(
        target_marks=target_marks,
        retrieved_context=context_block if context_block.strip() else "[Standard University Syllabus Context]",
        mark_instructions=MARK_INSTRUCTIONS[mark_key]
    ) + f"\n\nQuestion: {question}\n\nExam Solution:"
