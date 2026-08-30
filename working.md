## Project Overview & Summary

**University Q&A RAG System** is a standalone, fully local, open-source **Retrieval-Augmented Generation (RAG)** pipeline designed to answer questions related to university topics (such as academic policies, admissions, and financial aid) based on provided documents without needing external API keys.

---

### Key Components

1. **Document Ingestion & Chunking** ([`src/ingest.py`](file:///c:/Users/patil/Downloads/university-rag/src/ingest.py)):

   - Loads raw text documents from [`data/raw/`](file:///c:/Users/patil/Downloads/university-rag/data/raw/) (currently contains sample policy and FAQ files).
   - Splits documents into paragraph-based chunks (~100–150 words) with overlap to preserve context across boundaries.
2. **Embedding & Indexing** ([`src/build_index.py`](file:///c:/Users/patil/Downloads/university-rag/src/build_index.py)):

   - Uses `all-MiniLM-L6-v2` (`sentence-transformers`) to generate 384-dimensional dense vector embeddings.
   - Builds and persists a FAISS cosine similarity vector index in the `index/` directory.
3. **Retrieval & Generation** ([`src/rag.py`](file:///c:/Users/patil/Downloads/university-rag/src/rag.py)):

   - Embeds user queries and searches the FAISS index for top-$k$ relevant context chunks.
   - Feeds the retrieved passages into `google/flan-t5-base` via Hugging Face `transformers` to generate grounded answers and cite sources.
4. **CLI Interactive App** ([`src/app.py`](file:///c:/Users/patil/Downloads/university-rag/src/app.py)):

   - Provides an interactive terminal chat interface for asking questions in real-time.

---

### How to Run

#### 1. Setup Environment & Install Dependencies

Ensure you have Python installed (Python 3.10+ recommended), then install the required packages:

```powershell
pip install -r requirements.txt
```

*(Optional: If you use a virtual environment, activate it before running `pip install`)*

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

---

#### 2. Build the FAISS Vector Index

Run this step whenever you first set up the project or whenever you add/modify `.txt` files in [`data/raw/`](file:///c:/Users/patil/Downloads/university-rag/data/raw/):

```powershell
python src/build_index.py
```

> *Note: On the first run, this will download the `all-MiniLM-L6-v2` model (~90 MB) and cache it locally.*

---

#### 3. Start the Interactive CLI Chatbot

To start asking questions interactively in your terminal:

```powershell
python src/app.py
```

> *Note: The first execution will download the `google/flan-t5-base` model (~1 GB). Subsequent runs will load quickly from local cache.*

---

#### 4. Programmatic Usage (Python)

You can also import and query the pipeline in Python scripts:

```python
from src.rag import UniversityRAG

rag = UniversityRAG()
result = rag.answer("What GPA do I need to keep my scholarship?")

print("Answer:", result["answer"])
print("Sources:", result["sources"])
```

```
```
