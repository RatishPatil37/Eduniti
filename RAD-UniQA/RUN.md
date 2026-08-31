# RAD-UniQA: Step-by-Step Execution Guide (`RUN.md`)

This guide provides the complete, copy-pasteable commands to run the **RAD-UniQA** project on **any new device** (Windows, macOS, or Linux) with zero friction.

---

## 📋 Prerequisites Checklist

Before starting, ensure the new device has:
1. **Python 3.10 to 3.13** ([python.org](https://www.python.org/downloads/))
2. **Node.js 18+ & npm** ([nodejs.org](https://nodejs.org/))
3. **Git** ([git-scm.com](https://git-scm.com/))
4. *(Optional & Recommended)* **`uv`** package manager for 10x faster installation (`pip install uv`).
5. *(Optional)* **Supabase Account** (for cloud user logins, document vault, and saved questions).
6. *(Optional)* **Qdrant Cloud Cluster** (for cloud vector hosting; otherwise embedded local disk mode is used automatically).
7. *(Optional)* **Ollama** (if running 100% offline without API keys).

---

## 🚀 Step 1: Clone the Repository

Open PowerShell, Command Prompt, or Terminal:

```powershell
git clone https://github.com/RatishPatil37/Eduniti.git
cd Eduniti/RAD-UniQA
```

---

## 🐍 Step 2: Set Up Python Virtual Environment & Install Dependencies

### Option A: Ultra-Fast Installation with `uv` (Recommended — 15 Seconds)
```powershell
# 1. Create a virtual environment
python -m venv .venv

# 2. Activate the virtual environment
# Windows (PowerShell):
.venv\Scripts\activate
# macOS / Linux:
# source .venv/bin/activate

# 3. Install dependencies using uv
pip install uv
uv pip install -r requirements.txt
```

### Option B: Standard `pip` Installation
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

---

## ⚙️ Step 3: Configure Environment Variables

### 1. Backend Environment Setup (`RAD-UniQA/.env`)

Create a `.env` file inside the `RAD-UniQA/` folder:

```env
# --- LLM Provider Selection ---
LLM_PROVIDER=auto

# --- 1. Google Gemini API (Primary Generator & Embeddings) ---
# Get free key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash
GEMINI_SECONDARY_MODEL=gemini-3.5-flash
GEMINI_FAST_MODEL=gemini-3.5-flash-lite
GEMINI_EMBED_MODEL=gemini-embedding-2

# --- 2. Groq Cloud API (High-Throughput Fallback) ---
# Get free key at https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# --- 3. Qdrant Vector Database ---
# Leave as local for embedded disk mode, or paste your Qdrant Cloud URL & Key
QDRANT_URL=local
# QDRANT_URL=https://<cluster-id>.us-east4-0.gcp.cloud.qdrant.io:6333
# QDRANT_API_KEY=your_qdrant_cloud_api_key_here
QDRANT_COLLECTION=rad_uniqa

# --- 4. Supabase Cloud Database & Auth (Optional) ---
# Get from https://supabase.com/dashboard → Project Settings → API
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

# --- 5. Retrieval Settings ---
PARENT_CHUNK_SIZE=1000
CHILD_CHUNK_SIZE=250
TOP_K_CANDIDATES=12
TOP_K_FINAL=5
```

### 2. Frontend Environment Setup (`RAD-UniQA/frontend/.env`)

Create a `.env` file inside the `RAD-UniQA/frontend/` folder:

```env
VITE_API_BASE=http://localhost:8000
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## 📄 Step 4: Verify Existing Course Embeddings (Instant Startup)

> [!NOTE]
> The repository already includes pre-computed syllabus vector embeddings and BM25 index inside `qdrant_storage/` and `docs/processed_chunks/`.
> **You do NOT need to re-index anything on a new device.** The system works immediately out of the box!

*(Optional: If you ever want to index additional new course PDFs via CLI):*
```powershell
python scripts/index_documents.py --dir docs/raw_documents --subject NLP
```

---

## 🧪 Step 5: Run Automated System Verification

Before starting the servers, run the automated test suite to ensure all components are functional:

```powershell
# 1. Verify Qdrant Dual-Mode and Supabase Fallback
python tests/test_hybrid_architecture.py

# 2. Verify 5-Tier LLM Failover Hierarchy
python tests/test_failover.py

# 3. Verify LaTeX & Markdown Table Normalizer (requires Node)
node tests/test_normalizer.js
```

You should see:
`🎉 ALL TESTS PASSED SUCCESSFULLY!`

---

## 🖥️ Step 6: Start the FastAPI Backend Server (Terminal 1)

> **Important:** Always use `python -m uvicorn` (rather than bare `uvicorn`) to avoid Windows execution policy restrictions:

```powershell
# Make sure .venv is activated
.venv\Scripts\activate

# Start backend server with live reload
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

* **Health check:** `http://localhost:8000/health`
* **Swagger API Documentation:** `http://localhost:8000/docs`

---

## 🌐 Step 7: Start the React / Vite Frontend (Terminal 2)

Open a **second terminal window**:

```powershell
cd RAD-UniQA/frontend

# Install frontend packages (first run only)
npm install

# Launch development server
npm run dev
```

The frontend will start at: **`http://localhost:5173`**

---

## 🎯 Step 8: Access & Explore the Application

Open your browser and navigate to:
👉 **`http://localhost:5173`**

### Available Intelligence Features:
1. **Synthesize Answer (Q&A):** Generate mark-tailored answers (**2-mark, 5-mark, 10-mark**) with step-by-step LaTeX math derivations, structured "Where:" symbol breakdowns, and Mermaid flowchart diagrams.
2. **Claude-Style Diagram Modal:** Click the expand icon on any Mermaid architecture diagram to view and copy high-resolution diagrams in a fullscreen lightbox.
3. **Document Vault:** Upload, pin, or inspect course PDFs with dual-mode storage (local disk + Supabase cloud sync).
4. **Question Predictor:** View high-probability university exam questions categorized by frequency, bloom level, and examiner reasoning.
5. **Mock Exam Paper:** Generate full 100-mark university question papers categorized into Section A, B, and C.
6. **Concept Knowledge Graph:** Interactive visualization of topic prerequisite dependencies and study flow.
7. **7-Day Study Planner:** Daily revision roadmap with time allocations and module priority.
8. **Practice Arena:** Timed mock tests with automated grading and progressive hints.
9. **Authentication:** Sign in via Google OAuth, GitHub OAuth, or Email with Supabase.

---

## 🔧 Troubleshooting Common New-Device Issues

### 1. Windows PowerShell: "Execution of scripts is disabled on this system"
Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 2. Node / Vite build error: `Cannot find module ...`
Clear npm cache and reinstall:
```powershell
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 3. Port 8000 is already in use
Specify an alternative port for FastAPI:
```powershell
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8080 --reload
```
*(Remember to update `VITE_API_BASE=http://localhost:8080` in `frontend/.env`)*
