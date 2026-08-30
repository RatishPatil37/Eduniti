# RAD-UniQA: Enterprise University Question Answering & Exam Intelligence System

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0-61DAFB.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC2626.svg)](https://qdrant.tech/)
[![Ollama](https://img.shields.io/badge/Ollama-Llama_3.1-black.svg)](https://ollama.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An end-to-end, production-grade **Retrieval-Augmented Generation (RAG) & Exam Intelligence Platform** built specifically for university academics.

Unlike generic document chatbots, **RAD-UniQA** analyzes historical past-year papers, predicts recurring exam trends, structures responses according to exact university grading rubrics (**2, 5, and 10-mark strategies** with LaTeX equations and Mermaid diagrams), and features an **intelligent multi-provider LLM router** (Local Ollama, Google Gemini, and Groq).

---

## 🏛️ System Architecture

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │                     Client Layer                       │
                                    │          Next.js / React 18 + Vite (Dark Glass)        │
                                    │  - Student Dashboard (Analytics, Practice, Predictor)  │
                                    │  - Real-time Q&A Interface with LaTeX + Mermaid charts │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │ HTTPS / REST
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │                  API & Gateway Layer                   │
                                    │                 FastAPI (Async Python)                 │
                                    │  - Pydantic Request Validation & Latency Tracker       │
                                    │  - Subject, Module, & Target Marks Routing             │
                                    └──────────────┬──────────────────────────┬──────────────┘
                                                   │                          │
                 ┌─────────────────────────────────┴──────────┐               │
                 ▼                                            ▼               ▼
┌──────────────────────────────────┐      ┌─────────────────────────┐  ┌───────────────────────────────┐
│     Batch Ingestion Engine       │      │  Processed Store & Cache│  │  Intelligent LLM Router Engine│
│  - PyMuPDF LaTeX/Table Parser    │      │ - BM25 Corpus Storage   │  │ 1. Heavy Derivation (10-M):   │
│  - Parent-Child Chunker          │      │ - Parent Chunk Lookup   │  │    -> Google Gemini API       │
│    (1000 Parent / 250 Child)     │      │ - Syllabus Metadata     │  │ 2. Fast Q&A (2-M / 5-M):      │
│  - Metadata Regex Extraction     │      └────────────┬────────────┘  │    -> Groq Cloud (~500 t/s)   │
└────────────────┬─────────────────┘                   │               │ 3. Offline / Private Fallback:│
                 │                                     │               │    -> Local Ollama (Llama 3.1)│
                 ▼                                     ▼               └───────────────┬───────────────┘
┌──────────────────────────────────┐    ┌───────────────────────────────┐              │
│    Vector & Hybrid Search Tier   │    │   Hybrid Fusion & Reranking   │              │
│ - Qdrant: Dense BGE-M3 (1024-dim)│◄───┤ 1. Dense + BM25 Sparse Search │◄─────────────┘
│ - BM25Okapi: Lexical Precision   │    │ 2. Reciprocal Rank Fusion(RRF)│
│ - Metadata Filter (Subject/Year) │    │ 3. BGE Cross-Encoder Reranker │
└──────────────────────────────────┘    └───────────────────────────────┘
```

---

## 🌟 Key Features

| Feature Module | Description |
| :--- | :--- |
| **Exam Q&A Synthesis** | Answers grounded in university PDFs, adapting depth for **2-Mark** (definitions + LaTeX), **5-Mark** (mechanisms + comparison tables), and **10-Mark** (comprehensive derivations + Mermaid diagrams). |
| **Intelligent LLM Router** | Dynamically routes queries to **Google Gemini** (heavy derivations), **Groq** (instant response), or **Local Ollama** (`llama3.1:8b-instruct-q5_K_M` for 100% offline privacy). |
| **Hierarchical Parent-Child RAG** | Indexes small child chunks (250 tokens) for search precision while feeding full parent chunks (1000 tokens) to the LLM for synthesis context. |
| **Hybrid Search with RRF** | Combines dense vector cosine similarity (`BAAI/bge-m3`) with lexical sparse search (`BM25Okapi`) fused via Reciprocal Rank Fusion ($k=60$). |
| **BGE Cross-Encoder Reranker** | Evaluates query-document pairs with `BAAI/bge-reranker-v2-m3` to filter out irrelevant context. |
| **Question Predictor & Trends** | Identifies recurring exam questions, high-priority syllabus topics, and historical gaps using DBSCAN pattern detection. |
| **Mock Exam Paper Generator** | Synthesizes full 100-mark university question papers categorized into Section A (20M), Section B (40M), and Section C (40M). |
| **Concept Knowledge Graph** | Models prerequisite relationships between topics and generates optimal step-by-step study paths. |
| **Personalized Study Planner** | Generates a structured 7-day revision schedule targeting 85%+ score. |
| **Interactive Practice Mode** | Evaluates student answers, awards marks, gives Bloom's level grading, and offers progressive hints. |

---

## 📁 Repository Directory Structure

```
RAD-UniQA/
├── frontend/                              # React 18 + Vite Web Application
│   ├── src/
│   │   ├── App.jsx                       # Full interactive dashboard with 6 tabs
│   │   ├── index.css                     # Dark glassmorphic design system
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── src/                                  # FastAPI Backend Application
│   ├── api/
│   │   ├── main.py                       # REST API endpoints
│   │   └── schemas.py                    # Strict Pydantic schemas
│   ├── ingestion/
│   │   ├── pdf_parser.py                 # PyMuPDF LaTeX & table extraction
│   │   ├── chunker.py                    # Hierarchical Parent (1000) & Child (250) Chunker
│   │   └── metadata.py                   # Automatic regex subject/module/year tagger
│   ├── retriever/
│   │   ├── vector_store.py               # Qdrant client connection & dense vector indexing
│   │   ├── hybrid_search.py              # Parallel Dense + BM25 search with RRF (k=60)
│   │   └── reranker.py                   # BAAI/bge-reranker-v2-m3 & Parent Context Resolver
│   ├── generator/
│   │   ├── llm_router.py                 # Task-aware router (Gemini / Groq / Ollama)
│   │   ├── prompts.py                    # Mark-adaptive prompt templates (2, 5, 10 marks)
│   │   └── rag_chain.py                  # End-to-end async LLM synthesis pipeline
│   ├── intelligence/                     # Exam Intelligence Suite (Predictor, Mock, Graphs)
│   └── config.py                         # Pydantic Settings & environment loader
│
├── docs/
│   ├── raw_documents/                    # Drop your syllabus & exam PDFs here
│   └── processed_chunks/                 # Auto-generated BM25 corpus & Parent stores
├── scripts/
│   ├── index_documents.py                # Batch PDF Ingestion CLI
│   └── verify_pipeline.py                # Pipeline verification for Parent-Child & LaTeX rules
├── tests/                                # Unit tests for ingestion, retrieval, generation
├── .env.example                          # Environment variable configuration template
├── requirements.txt                      # Backend dependencies
└── README.md
```

---

## 🛠️ Step-by-Step Installation & Run Guide

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Docker Desktop** (for running Qdrant vector database)
- *(Optional)* **Ollama** installed with `llama3.1:8b-instruct-q5_K_M` (for offline execution)

---

### 2. Clone & Setup Python Virtual Environment

Open PowerShell or Terminal:

```powershell
# Navigate to the project root directory
cd "C:\Users\patil\OneDrive - South Indian Education Society\Documents\clg\NLP\RAD-UniQA"

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install all backend dependencies
pip install -r requirements.txt
```

---

### 3. Environment Configuration

Copy the example environment file:

```powershell
cp .env.example .env
```

Open `.env` in your editor and configure your credentials:

```env
# Choose provider: "auto" (recommended), "ollama", "gemini", or "groq"
LLM_PROVIDER=auto

# 1. Local Ollama (Recommended for 16GB RAM compute - 100% Free & Offline)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b-instruct-q5_K_M

# 2. Google Gemini API (Free tier available at https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# 3. Groq Cloud (Free tier available at https://console.groq.com/)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Qdrant Database
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=rad_uniqa
```

---

### 4. Start the Qdrant Vector Database

Start a local Qdrant container with Docker:

```powershell
docker run -d -p 6333:6333 -p 6334:6334 --name qdrant-db qdrant/qdrant
```

---

### 5. Ingest Academic Documents & Build Indexes

Place your university textbooks, notes, and past question papers in:
📁 `docs/raw_documents/` *(e.g., `NLP_Module_3_Notes_2024.pdf`, `ML_2023_QP.pdf`)*

Run the batch ingestion script:

```powershell
python scripts/index_documents.py --dir docs/raw_documents --subject NLP
```

This will automatically:
1. Parse PDFs preserving LaTeX equations and tables.
2. Build hierarchical Parent (1000 tokens) and Child (250 tokens) chunks.
3. Compute dense embeddings with `BAAI/bge-m3` and upload to Qdrant.
4. Save the sparse BM25 corpus and parent context stores to disk.

---

### 6. Verify the Pipeline & Standards

Run the verification test script:

```powershell
python scripts/verify_pipeline.py
```

---

### 7. Start the FastAPI Backend Server

In your active backend terminal:

```powershell
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend is now live at:
- **API Server:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

---

### 8. Start the React Frontend Web Application

Open a **new terminal window** and run:

```powershell
cd "C:\Users\patil\OneDrive - South Indian Education Society\Documents\clg\NLP\RAD-UniQA\frontend"

# Install frontend dependencies (only needed first time)
npm install

# Start the Vite development server
npm run dev
```

Open your browser and navigate to:
👉 **`http://localhost:5173`**

---

## 📡 API Endpoints Reference

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/query` | Primary RAG synthesis (LaTeX, Mermaid, mark-weighted answers with citations). |
| `POST` | `/api/v1/predict-questions` | Forecasts high-probability exam questions using pattern detection. |
| `POST` | `/api/v1/generate-mock` | Generates full 100-mark university pattern examination paper. |
| `GET` | `/api/v1/concept-graph/{subject}` | Returns topological knowledge graph with prerequisites and learning paths. |
| `POST` | `/api/v1/study-plan` | Generates personalized day-by-day exam preparation schedule. |
| `POST` | `/api/v1/practice/submit` | Evaluates student answers, provides marks breakdown and progressive hints. |
| `GET` | `/health` | Service health status and active models. |

---

## 🧪 Running Automated Unit Tests

```powershell
cd "C:\Users\patil\OneDrive - South Indian Education Society\Documents\clg\NLP\RAD-UniQA"
python -m unittest discover -s tests
```

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
