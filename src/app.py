"""
app.py
Simple command-line chat interface for the University Q&A RAG system.

Usage:
    python src/build_index.py   # run once (or whenever data/raw/ changes)
    python src/app.py           # start asking questions
"""

from rag import UniversityRAG


def main():
    print("Loading University Q&A RAG system (first run downloads models)...")
    rag = UniversityRAG()
    print("\nReady! Ask a question about admissions, academic policy, or financial aid.")
    print("Type 'exit' to quit, or 'sources' after an answer to see the retrieved passages.\n")

    last_result = None
    while True:
        query = input("You: ").strip()
        if not query:
            continue
        if query.lower() in ("exit", "quit"):
            break
        if query.lower() == "sources" and last_result:
            for c in last_result["contexts"]:
                print(f"\n[{c['source']}  (score={c['score']:.3f})]\n{c['text']}\n")
            continue

        last_result = rag.answer(query)
        print(f"\nBot: {last_result['answer']}")
        src_list = ", ".join(s["source"] for s in last_result["sources"])
        print(f"(sources: {src_list} — type 'sources' to see full passages)\n")


if __name__ == "__main__":
    main()
