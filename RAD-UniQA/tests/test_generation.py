"""
test_generation.py
Unit tests for prompt construction and mark adaptive instructions.
"""
from src.generator.prompts import build_prompt, MARK_INSTRUCTIONS


def test_build_prompt_mark_allocation():
    sample_contexts = [
        {
            "content": "A recurrent neural network (RNN) is a class of artificial neural networks...",
            "metadata": {"source": "NLP_Notes.pdf", "module_number": 2, "page_number": 15}
        }
    ]

    # Test 2-mark prompt
    prompt_2m = build_prompt("Define RNN", 2, sample_contexts)
    assert "TARGET MARKS: 2 Marks" in prompt_2m
    assert "Maximum 150 words" in prompt_2m
    assert "NLP_Notes.pdf" in prompt_2m

    # Test 5-mark prompt
    prompt_5m = build_prompt("Explain RNN architecture", 5, sample_contexts)
    assert "TARGET MARKS: 5 Marks" in prompt_5m
    assert "Section 3: Summary Table" in prompt_5m

    # Test 10-mark prompt
    prompt_10m = build_prompt("Derive backpropagation through time for RNN", 10, sample_contexts)
    assert "TARGET MARKS: 10 Marks" in prompt_10m
    assert "Mermaid diagram" in prompt_10m
    assert "Mathematical Derivation" in prompt_10m
