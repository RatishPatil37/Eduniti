# RAD-UniQA: Step-by-Step Execution Guide (`RUN.md`)

This guide provides the complete, copy-pasteable commands to run the **RAD-UniQA** project on **any new device** (with or without Docker, using cloud APIs or 100% offline local LLMs).

---

## 📋 Prerequisites Checklist
Before starting, ensure the new device has:
1. **Python 3.10+** ([python.org](https://www.python.org/downloads/))
2. **Node.js 18+ & npm** ([nodejs.org](https://nodejs.org/))
3. **Git** ([git-scm.com](https://git-scm.com/))
4. *(Optional)* **Docker Desktop** (if you prefer containerized Qdrant; otherwise, the built-in local disk fallback is used automatically).
5. *(Optional)* **Ollama** (if running 100% offline without API keys).

---

## 🚀 Step 1: Clone the Repository

Open PowerShell, Command Prompt, or Terminal:

```powershell
git clone https://github.com/RatishPatil37/Eduniti.git
cd Eduniti/RAD-UniQA
```

---

## 🐍 Step 2: Set Up Python Virtual Environment

```powershell
# 1. Create a virtual environment named .venv
python -m venv .venv

# 2. Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\activate
# On Linux / macOS:
# source .venv/bin/activate

# 3. Install all backend dependencies
pip install -r requirements.txt
```

---

## ⚙️ Step 3: Configure Environment Variables

```powershell
# Copy the example environment file
cp .env.example .env
```

Open `.env` in any text editor and choose your configuration:

### Option A: Using Free Cloud APIs (Fast & High Reasoning)
```env
LLM_PROVIDER=auto
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
QDRANT_URL=local
```
*(Get free keys at [Google AI Studio](https://aistudio.google.com/) and [Groq Console](https://console.groq.com/))*

### Option B: 100% Offline with Local Ollama (Zero API Keys Needed)
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b-instruct-q5_K_M
QDRANT_URL=local
```
*(Make sure Ollama is installed and run `ollama pull llama3.1:8b-instruct-q5_K_M`)*

---

## 📄 Step 4: Ingest Academic Documents (One-Time Setup)

Place your university textbooks, notes, and past question papers in `docs/raw_documents/`, then execute:

```powershell
python scripts/index_documents.py --dir docs/raw_documents --subject NLP
```

*(Note: You can also skip this CLI step and upload PDFs directly via the Web UI later!)*

---

## 🧪 Step 5: Verify the Pipeline

```powershell
python scripts/verify_pipeline.py
```
This confirms that the Parent-Child chunk linkages, RRF deduplication, and LaTeX math compliance tests are all passing.

---

## 🖥️ Step 6: Start the FastAPI Backend Server (Terminal 1)

> **Important:** Always use `python -m uvicorn` (rather than just `uvicorn`) to prevent Windows Device Guard execution policy blocks:

```powershell
# Make sure .venv is activated
.venv\Scripts\activate

# Start backend server
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

* **API Health check:** `http://localhost:8000/health`
* **Interactive API Swagger Docs:** `http://localhost:8000/docs`

---

## 🌐 Step 7: Start the React / Vite Frontend (Terminal 2)

Open a **second terminal window**:

```powershell
cd Eduniti/RAD-UniQA/frontend

# Install frontend dependencies (only required on first run)
npm install

# Launch Vite development server
npm run dev
```

---

## 🎯 Step 8: Access the Application

Open your browser and navigate to:
👉 **`http://localhost:5173`**

### Available Web Features:
1. **Upload PDFs:** Drag-and-drop academic PDFs for real-time parsing and Qdrant vector indexing.
2. **Ask Exam Q&A:** Generate mark-weighted answers (**2-mark, 5-mark, 10-mark**) with LaTeX derivations and Mermaid diagrams.
3. **Question Predictor:** View predicted questions with examiner reasoning and confidence scores.
4. **Mock Exam Paper:** Generate 100-mark university question papers.
5. **Concept Knowledge Graph:** Explore prerequisite topic dependencies and learning pathways.
6. **7-Day Study Planner:** Access personalized revision schedules.
7. **Practice Mode:** Submit answers for instant AI grading and progressive hints.
