"""
rag.py
Core Retrieval-Augmented Generation pipeline:
  1. Embed the user's question with the same sentence-transformers model
     used to build the index.
  2. Retrieve the top-k most similar chunks from FAISS.
  3. Build a grounded prompt containing only the retrieved context.
  4. Generate an answer with a small local instruction-tuned model
     (FLAN-T5), which runs entirely on CPU — no API key, no cost.

Swap EMBED_MODEL_NAME / GEN_MODEL_NAME for larger models if you have a
GPU and want higher quality answers (see README for suggestions).
"""

import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

INDEX_DIR = os.path.join(os.path.dirname(__file__), "..", "index")
FAISS_PATH = os.path.join(INDEX_DIR, "faiss.index")
META_PATH = os.path.join(INDEX_DIR, "metadata.json")

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
GEN_MODEL_NAME = "google/flan-t5-base"   # ~250M params, runs fine on CPU

TOP_K = 3


class UniversityRAG:
    def __init__(self):
        if not os.path.exists(FAISS_PATH):
            raise FileNotFoundError(
                "No index found. Run `python src/build_index.py` first."
            )
        self.index = faiss.read_index(FAISS_PATH)
        with open(META_PATH, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        print("Loading embedding model...")
        self.embedder = SentenceTransformer(EMBED_MODEL_NAME)

        print("Loading generation model (first run downloads weights)...")
        self.tokenizer = AutoTokenizer.from_pretrained(GEN_MODEL_NAME)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(GEN_MODEL_NAME)

    def retrieve(self, query: str, top_k: int = TOP_K):
        q_emb = self.embedder.encode([query], convert_to_numpy=True)
        faiss.normalize_L2(q_emb)
        scores, ids = self.index.search(q_emb.astype(np.float32), top_k)
        results = []
        for score, idx in zip(scores[0], ids[0]):
            if idx == -1:
                continue
            entry = self.metadata[idx]
            results.append({
                "score": float(score),
                "source": entry["source"],
                "text": entry["text"],
            })
        return results

    def build_prompt(self, query: str, contexts: list) -> str:
        context_block = "\n\n".join(
            f"[Source: {c['source']}]\n{c['text']}" for c in contexts
        )
        prompt = (
            "Answer the question using ONLY the information in the context below. "
            "If the answer is not contained in the context, say "
            "\"I don't have enough information to answer that.\"\n\n"
            f"Context:\n{context_block}\n\n"
            f"Question: {query}\n"
            "Answer:"
        )
        return prompt

    def answer(self, query: str, top_k: int = TOP_K, max_new_tokens: int = 128):
        contexts = self.retrieve(query, top_k=top_k)
        prompt = self.build_prompt(query, contexts)
        inputs = self.tokenizer(prompt, return_tensors="pt")
        outputs = self.model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
        answer_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
        return {
            "question": query,
            "answer": answer_text,
            "sources": [{"source": c["source"], "score": round(c["score"], 3)} for c in contexts],
            "contexts": contexts,
        }


def main():
    rag = UniversityRAG()
    test_questions = [
        "What is the application deadline for Fall semester?",
        "What GPA do I need to keep my merit scholarship?",
        "How many credit hours do I need to graduate?",
    ]
    for q in test_questions:
        result = rag.answer(q)
        print("\n" + "=" * 70)
        print(f"Q: {result['question']}")
        print(f"A: {result['answer']}")
        print(f"Sources: {result['sources']}")


if __name__ == "__main__":
    main()
