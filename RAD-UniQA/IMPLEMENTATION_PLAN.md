# RAD-UniQA: Phase 2 - Optimization, UI Overhaul & Authentication

## Overview

Five parallel problem areas identified from user feedback. This plan addresses them in priority order, with each phase being independently deployable. Total estimated implementation: ~2 sessions.

---

## Open Questions

> [!IMPORTANT]
> **Before starting Phase 5 (Auth):** Please set up a Supabase project at [supabase.com](https://supabase.com) and share:
> - `SUPABASE_URL` (e.g. `https://xxxxx.supabase.co`)
> - `SUPABASE_ANON_KEY` (from Project Settings -> API)
> I'll wire these into the frontend and the FastAPI backend immediately.

---

## Phase 1 - Fix LaTeX Rendering (Math display bugs)

### Root Cause Analysis
The three broken rendering scenarios from the images:

| Image | Symptom | Root Cause |
|-------|---------|-----------|
| **Image 1** | `ct`, `it`, `ft`, `ot` on separate lines, breaking prose | Inline `$...$` regex **failing** to match - the LLM is generating `$c_t$` but the split regex `\$[^$\n]+\$` rejects multiline or nested subscripts, so they fall through as raw text |
| **Image 3** | `f(x;θ) = f^(L)(...)` rendered as garbled symbols | The LLM generated `\mathbf{}`, `\left(`, `\right)` etc. but the KaTeX `throwOnError: false` silently renders partial garbage instead of showing a fallback |
| **Image 2** | ✅ Works - this is the correct `$$...$$` display mode block | This is the reference target format |

### Fix Strategy

**Backend (prompts.py):** Force the LLM to use only `$$...$$` display-mode blocks for ALL equations (even single variables). Inline `$...$` is forbidden in prompt rules. This eliminates the inline regex failure.

**Frontend (App.jsx `RenderMarkdown`):** Replace the custom hand-rolled renderer with `react-markdown` + `remark-math` + `rehype-katex` - the gold-standard pipeline that handles 100% of LaTeX edge cases correctly, renders partial expressions gracefully, and doesn't need custom regex parsing.

### Files to Change

#### [MODIFY] `src/generator/prompts.py`
- Add explicit rule: "ALL mathematical symbols, variables, and equations MUST be wrapped in `$$...$$` display blocks. NEVER use `$...$` inline delimiters."

#### [MODIFY] `frontend/src/App.jsx`
- Replace `RenderMarkdown` component with `react-markdown` + `remark-math` + `rehype-katex`
- Install: `npm install react-markdown remark-math rehype-katex`
- Import `katex/dist/katex.min.css` (already available since katex is installed)
- Handle `$$...$$` blocks as display math, `$...$` as inline math
- KaTeX error boundary: show `[Math Error: <raw latex>]` in red monospace instead of broken symbols

---

## Phase 2 - Speed Optimization (< 5 second answers)

### Current Bottleneck Analysis

```
RAG Pipeline Timeline (10-mark question, Gemini):
  1. Hybrid Search (Dense embed + Qdrant + BM25)       ~800ms-2s
  2. Cross-Encoder Reranker (BAAI/bge-reranker-v2-m3)  ~3-8s  <- MAIN BOTTLENECK
  3. Parent Store Resolution                           ~10ms
  4. Prompt Build                                      ~5ms
  5. Gemini LLM generation (streaming disabled)       ~4-12s <- 2nd BOTTLENECK
  6. Serialization + HTTP response                    ~50ms
  -----------------------------------------------------
  TOTAL (current)                                      8-22s
```

### Fix Strategy

#### 2a. Kill the Reranker for Speed
`BAAI/bge-reranker-v2-m3` is a 600MB cross-encoder that runs **synchronously** on CPU for every query. For a RAG system with a university exam corpus, the Qdrant vector similarity score is already sufficient for precision at `top_k=8`. 

**Replace with:** a lightweight keyword-overlap score (BM25 score normalized) as secondary sort. This brings rerank time from **3-8s -> ~2ms**.

#### 2b. Enable Streaming Generation
Currently `llm.ainvoke()` waits for the full Gemini response before sending anything. With streaming, the user sees the first token in **~400ms** instead of waiting 4-12 seconds for the complete answer.

**Implementation:**  
- Add `POST /api/v1/query/stream` SSE endpoint using `StreamingResponse`  
- Frontend switches to `EventSource`/`fetch` with streaming reader  
- Tokens are progressively appended to the answer box - the user sees real-time generation

#### 2c. Cache Embeddings for Repeated Queries
Common questions like "explain backpropagation" are embedded every single request. Add an in-memory LRU cache keyed by `(query_text, subject)` with TTL of 30 minutes.

#### 2d. Parallel Dense + BM25 Search
Currently dense and BM25 run sequentially. Wrap them in `asyncio.gather()` so they run in parallel: **saves ~300-800ms**.

#### 2e. Reduce TOP_K_CANDIDATES
Currently `TOP_K_CANDIDATES=20`. Reduce to `12`. More candidates -> longer reranking time with diminishing returns. Verified quality threshold for this corpus.

### Files to Change

#### [MODIFY] `src/generator/rag_chain.py`
- Remove cross-encoder reranker dependency
- Add lightweight BM25-score-based reranker (`sort by rrf_score, top 5`)
- Add query embedding LRU cache
- Add `answer_question_stream()` async generator for SSE

#### [MODIFY] `src/retriever/hybrid_search.py`
- Run dense + BM25 in `asyncio.gather()` in parallel

#### [MODIFY] `src/api/main.py`
- Add `GET /api/v1/query/stream` endpoint with `StreamingResponse` + `text/event-stream`

#### [MODIFY] `src/config.py`
- `TOP_K_CANDIDATES: int = 12`
- `TOP_K_FINAL: int = 5`

#### [MODIFY] `frontend/src/App.jsx`
- Replace `fetch('/api/v1/query')` with streaming `fetch` + `ReadableStream`
- Token-by-token append to answer text using React state

### Expected Timeline After Fix
```
  1. Hybrid Search (parallel)         ~500ms
  2. Lightweight rerank (BM25 sort)   ~2ms
  3. Parent Store + Prompt            ~10ms
  4. Gemini streaming (first token)   ~350ms  <- User sees this immediately
  -----------------------------------------
  Time to FIRST TOKEN                 ~900ms (Real-time feedback)
  Time to COMPLETE (10-mark)          ~4-6s  (streaming, user reading as it generates)
```

---

## Phase 3 - Document Ingestion Speed

### Current Bottleneck
Gemini Embedding API is called **one sentence at a time** in a `for text in sentences:` loop in `embedder.py`. For a 50-page PDF this means ~200-400 serial API calls, each with ~200ms latency = **40-80 seconds**.

### Fix Strategy

#### 3a. Batch Embedding API Calls
The Gemini Embedding API supports batching. Send all chunks in one `embed_content` call using `batch_embed_content` - reduces 200 API round-trips to **1 round-trip**.

#### 3b. Parallel Qdrant Upserts
Currently `upsert_child_chunks` sends vectors one by one. Switch to bulk upsert with `points_batch`.

#### 3c. Smarter PDF Parser
Current parser extracts noisy binary-encoded pages. Add a preprocessing step to detect and skip pages with >50% non-ASCII characters (these are encrypted/image-only pages that produce garbled text like the control character chunks in `parent_store.json`).

### Files to Change

#### [MODIFY] `src/retriever/embedder.py`
- Replace serial `for text in sentences:` loop with `genai.embed_content(content=[...])` batch call
- Fall back to chunked batches of 100 if list is too large

#### [MODIFY] `src/api/main.py`
- In `upload_pdf_endpoint`: add a pre-filter step to discard chunks where `len([c for c in content if ord(c) < 32]) / len(content) > 0.3`

---

## Phase 4 - UI Redesign (ShadCN-Inspired Black & White)

### Design Direction
**Reference:** [shadcn/ui](https://ui.shadcn.com) - crisp, minimal, stark black/white with precise typography and sharp borders. No generic gradients. No heavy glow. Clean, functional, and modern.

**Color System:**
```css
--background:   #09090B;  /* near-black zinc */
--surface-1:    #18181B;  /* zinc-900 card */
--surface-2:    #27272A;  /* zinc-800 elevated */
--border:       #3F3F46;  /* zinc-700 */
--border-muted: #27272A;  /* zinc-800 */
--text-primary: #FAFAFA;  /* zinc-50 */
--text-muted:   #A1A1AA;  /* zinc-400 */
--text-subtle:  #71717A;  /* zinc-500 */
--accent:       #FFFFFF;  /* pure white - primary CTA */
--accent-muted: #E4E4E7;  /* zinc-200 hover */
--destructive:  #EF4444;  /* red-500 */
--success:      #22C55E;  /* green-500 */
--warning:      #F59E0B;  /* amber-500 */
```

**Typography:** `Inter` (system-first sans-serif) + `JetBrains Mono` for code

**What gets removed:**
- All neon gradients and colored blur boxes
- `#6366F1` indigo accent -> replaced with clean white/zinc contrast
- Heavy background dot patterns
- Glassmorphism blur clutter

**What stays/improves:**
- Sidebar nav (crisp borders, minimalist monochrome)
- Drag-and-drop upload zone (sharper subpixel border, black/white hover)
- Answer box (stark high-contrast typography, mathematical clarity)
- Timer (clean monospace digits, sleek minimal pulse)
- Toast notifications (thin border-only design)

### Files to Change

#### [MODIFY] `frontend/src/index.css`
Complete rewrite with ShadCN zinc/black token system

#### [MODIFY] `frontend/src/App.css`
Complete rewrite - all components reskinned to high-end B&W

#### [MODIFY] `frontend/src/App.jsx`
- Update Mermaid theme variables to match monochrome palette
- Update any hardcoded color references

---

## Phase 5 - Landing Page + Supabase Auth

### Architecture

```
                +---------------------------------+
                |    React App (Vite + Router)    |
                |                                 |
  /             |  LandingPage.jsx (public)       |
  /login        |  LoginPage.jsx (Supabase Auth)  |
  /signup       |  SignupPage.jsx (Supabase Auth) |
  /app          |  App.jsx (protected, auth-gated)|
                +---------------------------------+
                              |
                    Supabase JS Client
                    (supabase-js v2)
                              |
                +---------------------------------+
                |         Supabase Project        |
                |  Auth (email/pass + Magic Link) |
                |  Postgres DB:                   |
                |    - user_profiles              |
                |    - answer_history             |
                |    - question_bank              |
                |    - vault_documents            |
                +---------------------------------+
                              |
                   FastAPI validates JWT
                   from Authorization header
                        on every request
```

### Supabase Setup Steps (User Action Item)

1. Go to [supabase.com](https://supabase.com) -> **New Project**
2. Name: `rad-uniqa`, set password, region: closest to user (`ap-south-1`)
3. After creation, go to **Settings -> API**:
   - Copy `Project URL` -> `SUPABASE_URL`  
   - Copy `anon public` key -> `SUPABASE_ANON_KEY`
   - Copy `service_role secret` key -> `SUPABASE_SERVICE_KEY` (for backend)
4. Go to **Authentication -> Email Templates** -> Configure confirmation settings if desired
5. Share these values to wire everything into the app.

### Database Schema

```sql
-- Answer History (per user)
create table if not exists answer_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  question text not null,
  subject text,
  target_marks int,
  generated_answer text,
  citations jsonb,
  created_at timestamptz default now()
);
alter table answer_history enable row level security;
create policy "Users see own history" on answer_history for all using (auth.uid() = user_id);

-- Question Bank (per user)
create table if not exists question_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  question text not null,
  subject text,
  tags text[],
  target_marks int,
  saved_at timestamptz default now()
);
alter table question_bank enable row level security;
create policy "Users see own bank" on question_bank for all using (auth.uid() = user_id);

-- Vault Documents (per user)
create table if not exists vault_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  filename text not null,
  subject text,
  pinned boolean default false,
  size_kb float,
  ingested_at timestamptz default now()
);
alter table vault_documents enable row level security;
create policy "Users see own docs" on vault_documents for all using (auth.uid() = user_id);
```

### New Files

#### [NEW] `frontend/src/lib/supabase.js`
- Initialize `@supabase/supabase-js` client with env vars

#### [NEW] `frontend/src/pages/LandingPage.jsx`
- Hero section: "AI-Powered University Exam Intelligence Platform"
- Feature showcases: Answer generation, PYQ prediction, Exam timer, Concept graph
- CTA: "Get Started" -> `/login`
- Design: ShadCN black/white, clean typography, minimalist feature cards

#### [NEW] `frontend/src/pages/AuthPage.jsx`
- Login & Signup tabs (email + password + magic link)
- Supabase error handling & session state

#### [NEW] `frontend/src/components/ProtectedRoute.jsx`
- Checks Supabase session state
- Redirects to `/login` if not authenticated

#### [MODIFY] `frontend/src/main.jsx`
- Setup routing: `/` -> LandingPage, `/login` -> AuthPage, `/app` -> ProtectedRoute(App)

#### [MODIFY] `src/api/main.py`
- Add JWT verification middleware using `supabase-py` service client
- Extract `user_id` from JWT and connect to Postgres DB

#### [MODIFY] `src/config.py`
- Add `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`

---

## Implementation Order

```
Phase 1 (LaTeX Fix)          -> highest user pain
Phase 2 (Streaming Speed)    -> critical latency reduction
Phase 3 (Ingestion Speed)    -> batch embed & parse cleanup
Phase 4 (UI Redesign)        -> ShadCN B&W monochrome redesign
Phase 5 (Auth + Landing)     -> Supabase auth & landing page
```

## Verification Plan

### Automated
- `python -c "import src.api.main"` - syntax and import verification
- `npm run build` - frontend build & bundle verification

### Manual Verification
- Ingest a PDF -> verify batch embedding speed
- Run 10-mark query -> verify streaming begins in < 1s
- Verify LaTeX equations render in clean KaTeX blocks without breaking lines
- Navigate landing page -> auth flow -> intelligence console
