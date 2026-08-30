import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.generator.llm_router import get_ordered_llm_candidates
from src.generator.prompts import build_prompt

def test_fallback_hierarchy_complex():
    candidates = get_ordered_llm_candidates(task="long_derivation", target_marks=10)
    print(f"Complex Candidates: {[c['desc'] for c in candidates]}")
    assert len(candidates) >= 4
    # Check strict hierarchy: 3.7 Flash -> 3.5 Flash -> 3.5 Flash Lite -> Groq -> Ollama
    assert candidates[0]["model"] == "gemini-3.7-flash"
    assert candidates[1]["model"] == "gemini-3.5-flash"
    assert candidates[2]["model"] == "gemini-3.5-flash-lite"
    assert candidates[3]["provider"] == "groq"
    assert candidates[4]["provider"] == "ollama"
    print("✅ Complex hierarchy test passed!")

def test_fallback_hierarchy_fast():
    candidates = get_ordered_llm_candidates(task="short_definition", target_marks=2)
    print(f"Fast Candidates: {[c['desc'] for c in candidates]}")
    assert len(candidates) >= 4
    assert candidates[0]["model"] == "gemini-3.5-flash-lite"
    assert candidates[1]["model"] == "gemini-3.5-flash"
    assert candidates[2]["model"] == "gemini-3.7-flash"
    print("✅ Fast hierarchy test passed!")

def test_prompt_has_gfm_rules():
    prompt = build_prompt("What is an Autoencoder?", 5, [])
    assert "MARKDOWN TABLES" in prompt
    assert "MATHEMATICAL NOTATION" in prompt
    assert "### References" in prompt
    print("✅ GFM & math prompt rules test passed!")

if __name__ == "__main__":
    test_fallback_hierarchy_complex()
    test_fallback_hierarchy_fast()
    test_prompt_has_gfm_rules()
    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")
