import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
  BookOpen, Sparkles, FileText, TrendingUp, GitFork, Calendar,
  Send, CheckCircle2, Clock, ChevronRight, BarChart3, Award,
  Cpu, UploadCloud, FileCheck, RefreshCw, FolderOpen, Copy,
  Check, Printer, Flame, AlertCircle, Lightbulb, Zap, Target,
  GraduationCap, History, BookMarked, Search, Pin, PinOff,
  Trash2, Download, ChevronLeft, ChevronDown, ChevronUp,
  AlignLeft, Timer, Map, SplitSquareHorizontal, X, Menu,
  PanelLeftClose, PanelLeft, FileUp, Eye, MoreHorizontal,
  Layers, Hash, Activity, Star, ArrowLeft, Play, Pause, RotateCcw,
  LogOut, User, Maximize2, Minimize2
} from 'lucide-react';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { supabase } from './lib/supabase.js';
import './index.css';
import './App.css';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  themeVariables: {
    darkMode: true,
    background: '#0C0C0E',
    primaryColor: '#18181B',
    primaryTextColor: '#FAFAFA',
    primaryBorderColor: '#3F3F46',
    lineColor: '#A1A1AA',
    secondaryColor: '#121215',
    tertiaryColor: '#27272A',
    fontSize: '13px'
  }
});

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ============================================================
// PURE UTILITY & SUBCOMPONENTS (Defined outside to avoid unmounting)
// ============================================================

// Sanitizes Mermaid code: auto-quotes unquoted bracket labels containing special characters
function sanitizeMermaid(code) {
  if (!code) return '';
  let sanitized = code.trim();
  
  // Ensure diagram starts with standard definition
  if (!sanitized.startsWith('flowchart') && !sanitized.startsWith('graph') && !sanitized.startsWith('sequenceDiagram') && !sanitized.startsWith('classDiagram')) {
    sanitized = `flowchart TD\n${sanitized}`;
  }

  // Quote unquoted brackets containing special characters (&, _, +, -, etc.)
  // e.g. A[Input x_t & h_{t-1}] -> A["Input x_t & h_{t-1}"]
  sanitized = sanitized.replace(/(\w+)\s*\[([^"\]]+?)\]/g, (match, id, text) => {
    if (text.startsWith('"') && text.endsWith('"')) return match;
    return `${id}["${text.replace(/"/g, "'")}"]`;
  });

  return sanitized;
}

// Mermaid renderer helper — handles ```mermaid blocks with Claude-Style Artifact Modal
const MermaidBlock = memo(function MermaidBlock({ code }) {
  const ref = useRef(null);
  const modalRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sanitizedCode = useMemo(() => sanitizeMermaid(code), [code]);

  useEffect(() => {
    const id = `mg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, sanitizedCode)
      .then(({ svg }) => {
        setSvgContent(svg);
        setError(false);
      })
      .catch(() => {
        setError(true);
      });
  }, [sanitizedCode]);

  useEffect(() => {
    if (ref.current && svgContent) {
      ref.current.innerHTML = svgContent;
    }
  }, [svgContent]);

  useEffect(() => {
    if (modalRef.current && svgContent) {
      modalRef.current.innerHTML = svgContent;
    }
  }, [svgContent, isModalOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="mermaid-wrap">
        <div className="mermaid-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FAFAFA', fontWeight: 600 }}>
            <GitFork size={14} style={{ color: '#38BDF8' }} /> Architecture Diagram
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn btn-ghost btn-icon-square" onClick={() => setIsModalOpen(true)} title="Expand Fullscreen View (Claude Artifact)">
              <Maximize2 size={13} />
            </button>
            <button className="btn btn-ghost btn-icon-square" onClick={handleCopy} title="Copy Mermaid Code">
              {copied ? <Check size={13} style={{ color: '#34D399' }} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
        <div className="mermaid-body" ref={ref}>
          {error ? (
            <pre style={{ fontSize: '11px', color: '#FCA5A5', whiteSpace: 'pre-wrap', textAlign: 'left' }}>{code}</pre>
          ) : !svgContent ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.80rem' }}>
              <RefreshCw size={14} className="animate-spin" /> Rendering diagram...
            </div>
          ) : null}
        </div>
      </div>

      {/* Claude-Style Artifact Modal Viewer */}
      {isModalOpen && (
        <div className="mermaid-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="mermaid-modal-content" onClick={e => e.stopPropagation()}>
            <div className="mermaid-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GitFork size={16} style={{ color: '#38BDF8' }} />
                <span style={{ fontSize: '0.94rem', fontWeight: 600, color: '#FAFAFA' }}>System Architecture & Flowchart</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn btn-ghost" onClick={handleCopy}>
                  {copied ? <Check size={13} style={{ color: '#34D399' }} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
                <button className="btn btn-ghost btn-icon-square" onClick={() => setIsModalOpen(false)} title="Close">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="mermaid-modal-body" ref={modalRef}>
              {!svgContent && <div style={{ color: '#71717A' }}>Loading diagram...</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// Normalizes LaTeX math, single dollar signs, and Markdown GFM tables
function normalizeMarkdown(rawText) {
  if (!rawText) return '';

  let text = rawText;

  // 1. Fix single-line concatenated table rows (e.g. "| a | b | | --- | --- | | c | d |" -> "|\n|")
  text = text.replace(/\|\s*\|\s*(?=[^:\n|]*[:\w-])/g, '|\n|');

  // 2. Fix broken LaTeX with newlines before closing dollars (e.g. "$x \in R^d\n$, the encoder" -> "$x \in R^d$, the encoder")
  text = text.replace(/\$([^$\n]+?)\n\s*(\$,|\$\.|\$\:|\$)/g, (match, expr, trailing) => {
    const punct = trailing.startsWith('$') ? trailing.slice(1) : trailing;
    return `$${expr.trim()}$${punct ? punct : ''}`;
  });

  // Fix "$formula\n$" -> "$$formula$$"
  text = text.replace(/\$([^\n$]+?)\n\s*\$/g, (m, g1) => `\n\n$$\n${g1.trim()}\n$$\n\n`);

  // 3. Fix split dollar signs within empty lines ("$\n$" or "$\n\n$")
  text = text.replace(/\$\s*\n+\s*\$/g, '');

  // 4. Remove standalone empty math blocks ($$$$, $$ $$, or consecutive standalone $$ lines)
  text = text.replace(/\$\$\s*\$\$/g, '');
  
  // Clean line-by-line empty math artifacts
  const rawLines = text.split('\n');
  const cleanedMathLines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    const nextLine = (rawLines[i + 1] || '').trim();
    // If this line is just '$$' and next line is just '$$', skip both
    if (line === '$$' && nextLine === '$$') {
      i++; // skip next line as well
      continue;
    }
    // If line is just empty math '$' or '$$' with nothing inside
    if (line === '$$$$' || line === '$$ $$' || line === '$$') {
      const prevLine = (rawLines[i - 1] || '').trim();
      if ((prevLine === '' || prevLine === '$$') && (nextLine === '' || nextLine === '$$')) {
        continue;
      }
    }
    cleanedMathLines.push(rawLines[i]);
  }
  text = cleanedMathLines.join('\n');

  // 5. Fix table rows broken by multi-line cells
  const lines = text.split('\n');
  const normalizedLines = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const isTableSeparator = /^\|?\s*:?-+:?\s*\|/.test(line.trim());
    const isTableLine = line.trim().startsWith('|') && line.trim().endsWith('|');

    if (isTableSeparator || isTableLine) {
      inTable = true;
      normalizedLines.push(line);
    } else if (inTable && (line.trim().startsWith('$') || line.trim().includes('|')) && normalizedLines.length > 0) {
      const prevLine = normalizedLines[normalizedLines.length - 1];
      if (prevLine.trim().endsWith('|')) {
        normalizedLines[normalizedLines.length - 1] = `${prevLine.slice(0, -1)} ${line.trim()} |`;
      } else {
        normalizedLines[normalizedLines.length - 1] += ` ${line.trim()}`;
      }
    } else {
      inTable = false;
      normalizedLines.push(line);
    }
  }

  text = normalizedLines.join('\n');

  // 6. Ensure $$ block math has surrounding blank lines for clean KaTeX display
  text = text
    .replace(/([^\n])\$\$/g, '$1\n\n$$$$')
    .replace(/\$\$([^\n])/g, '$$$$\n\n$1');

  // 7. Clean any remaining consecutive empty lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

// Gold-standard math & table renderer: react-markdown + remark-gfm + remark-math + rehype-katex
// Handles: GFM tables, $$display math$$, $inline math$, mermaid blocks, code blocks
const RenderMarkdown = memo(function RenderMarkdown({ text }) {
  if (!text) return null;

  // 1. Text normalization:
  const cleanedText = normalizeMarkdown(text);

  // 2. Pre-process: extract mermaid blocks before react-markdown
  const mermaidBlocks = [];
  const processedText = cleanedText.replace(/```mermaid([\s\S]*?)```/g, (_, code) => {
    const idx = mermaidBlocks.length;
    mermaidBlocks.push(code.trim());
    return `:::mermaid-${idx}:::`;
  });

  // 3. Custom high-end components for react-markdown
  const components = {
    // Render mermaid placeholder lines
    p({ children }) {
      const str = typeof children === 'string' ? children : '';
      const match = str.match(/^:::mermaid-(\d+):::$/);
      if (match) {
        const code = mermaidBlocks[parseInt(match[1])];
        return code ? <MermaidBlock code={code} /> : null;
      }
      return <p style={{ margin: '0.6rem 0', lineHeight: 1.7 }}>{children}</p>;
    },
    code({ inline, className, children }) {
      const lang = (className || '').replace('language-', '');
      const raw = String(children).replace(/\n$/, '');
      if (!inline) {
        return (
          <pre className="font-mono" style={{ background: '#0C0C0E', border: '1px solid #27272A', borderRadius: 8, padding: '1rem', overflowX: 'auto', fontSize: '0.84rem', margin: '0.85rem 0' }}>
            <code className={className}>{raw}</code>
          </pre>
        );
      }
      return <code style={{ background: '#27272A', padding: '0.1em 0.35em', borderRadius: 4, fontSize: '0.86em', fontFamily: 'JetBrains Mono, monospace' }}>{raw}</code>;
    },
    h1: ({ children }) => <h1 style={{ fontSize: '1.40rem', fontWeight: 700, margin: '1.30rem 0 0.5rem', color: '#FAFAFA', letterSpacing: '-0.02em' }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ fontSize: '1.18rem', fontWeight: 600, margin: '1.30rem 0 0.5rem', color: '#FAFAFA', letterSpacing: '-0.01em', borderBottom: '1px solid #27272A', paddingBottom: '0.40rem' }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontSize: '1.02rem', fontWeight: 600, margin: '1.10rem 0 0.40rem', color: '#E4E4E7' }}>{children}</h3>,
    ul: ({ children }) => <ul style={{ paddingLeft: '1.5rem', margin: '0.6rem 0', lineHeight: 1.75 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ paddingLeft: '1.5rem', margin: '0.6rem 0', lineHeight: 1.75 }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: '0.35rem', color: '#D4D4D8' }}>{children}</li>,
    blockquote: ({ children }) => (
      <blockquote style={{ borderLeft: '3px solid #3F3F46', paddingLeft: '1rem', margin: '0.85rem 0', color: '#71717A', fontStyle: 'italic' }}>{children}</blockquote>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '1.35rem 0', borderRadius: '8px', border: '1px solid #27272A', background: '#121215' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead style={{ background: '#18181B', borderBottom: '2px solid #3F3F46' }}>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr style={{ borderBottom: '1px solid #27272A' }}>{children}</tr>,
    th: ({ children }) => <th style={{ padding: '0.65rem 0.90rem', color: '#FAFAFA', fontWeight: 600, borderRight: '1px solid #27272A' }}>{children}</th>,
    td: ({ children }) => <td style={{ padding: '0.65rem 0.90rem', color: '#D4D4D8', borderRight: '1px solid #27272A', lineHeight: 1.55 }}>{children}</td>,
    strong: ({ children }) => <strong style={{ fontWeight: 600, color: '#FAFAFA' }}>{children}</strong>,
  };

  return (
    <div className="answer-markdown">
      <ReactMarkdown
        remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={components}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
});

// Toast Stack
function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'error' ? <AlertCircle size={16} /> : t.type === 'success' ? <CheckCircle2 size={16} /> : <Lightbulb size={16} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// Spotlight Search
function SpotlightOverlay({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="spotlight-backdrop" onClick={onClose}>
      <div className="spotlight-panel" onClick={e => e.stopPropagation()}>
        <div className="spotlight-input-wrap">
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="spotlight-input"
            placeholder="Search vault documents, question bank, history..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          {loading && <RefreshCw size={15} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
          <span className="kbd-shortcut">Esc</span>
        </div>
        <div className="spotlight-results">
          {results.length === 0 && query.length >= 2 && !loading && (
            <div className="empty-state" style={{ padding: '36px 16px' }}>
              <Search size={22} style={{ opacity: 0.3 }} />
              <div className="text-sm text-muted">No results found for "{query}"</div>
            </div>
          )}
          {query.length < 2 && (
            <div className="empty-state" style={{ padding: '36px 16px' }}>
              <div className="text-xs text-muted">Type at least 2 characters to search...</div>
            </div>
          )}
          {results.map((r, i) => (
            <div key={i} className="spotlight-result-item" onClick={() => { onSelect?.(r); onClose(); }}>
              <div className="spotlight-result-icon" style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#18181B',
                border: '1px solid #27272A',
                color: '#FAFAFA',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {r.type === 'document' ? <FileText size={16} /> : r.type === 'bank' ? <BookMarked size={16} /> : <History size={16} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-pure)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{r.subtitle}</div>
              </div>
              <span className="badge-tag badge-indigo" style={{ textTransform: 'capitalize' }}>{r.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton helper
function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 13, width: i === 0 ? '60%' : i === lines-1 ? '40%' : '85%' }} />
      ))}
    </div>
  );
}

// ============================================================
// ISOLATED EXAM TIMER WORKSPACE (State-isolated from tick rerenders)
// ============================================================
const ExamTimerWorkspace = memo(function ExamTimerWorkspace({ subject, toast }) {
  const [duration, setDuration] = useState(3600);
  const [remaining, setRemaining] = useState(3600);
  const [state, setState] = useState('idle'); // idle | running | paused | done
  const [question, setQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const startExam = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/generate-mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, total_marks: 100, duration_mins: Math.round(duration / 60) })
      });
      const data = await res.json();
      const firstQ = data.sections?.[0]?.questions?.[0] || { text: "Explain Gradient Descent optimization algorithm.", marks: 10 };
      setQuestion(firstQ);
      setRemaining(duration);
      setUserAnswer('');
      setResult(null);
      setState('running');
    } catch {
      setQuestion({ text: "Explain the working of Support Vector Machines (SVM).", marks: 10 });
      setRemaining(duration);
      setState('running');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state === 'running') {
      timerRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(timerRef.current);
            setState('done');
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [state]);

  const submitExam = async () => {
    clearInterval(timerRef.current);
    setState('done');
    if (!userAnswer.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/practice/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: 'timer_exam',
          question_text: question?.text || '',
          user_answer: userAnswer,
          target_marks: question?.marks || 10
        })
      });
      const data = await res.json();
      setResult(data);
    } catch {
      const words = userAnswer.split(/\s+/).length;
      const score = Math.min(question?.marks || 10, Math.max(2, Math.floor(words / 15)));
      setResult({
        target_marks: question?.marks || 10,
        awarded_score: score,
        percentage: (score / (question?.marks || 10)) * 100,
        feedback: "Answer analyzed. Clear structure and relevant technical keywords used.",
        progressive_hints: ["Include LaTeX mathematical formulation", "Add an architecture diagram"],
        suggested_improvement: "Structure your 10-mark response with formal definition, derivations, and application trade-offs."
      });
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="tab-content">
      <div className="page-header">
        <h2 className="page-title gradient-title">Exam Timer Simulation</h2>
        <p className="page-subtitle">Timed university examination conditions with live countdown and instant grading.</p>
      </div>

      {state === 'idle' && (
        <div className="glass-panel-elevated" style={{ maxWidth: 480, margin: '20px auto', padding: 28 }}>
          <div className="timer-center">
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--cyan-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan-light)' }}>
              <Timer size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 4 }}>Configure Exam Time</h3>
              <p className="text-xs text-muted">Select duration for {subject} exam practice</p>
            </div>
            <div style={{ width: '100%' }}>
              <label className="field-label">Duration</label>
              <div className="pill-selector-bar" style={{ justifyContent: 'center' }}>
                {[1800, 3600, 7200, 10800].map(d => (
                  <button key={d} className={`pill-option-btn ${duration === d ? 'active' : ''}`} onClick={() => setDuration(d)}>
                    {d < 3600 ? `${d/60}m` : `${d/3600}h`}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={startExam} disabled={loading}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
              {loading ? 'Preparing Exam...' : 'Start Timed Exam'}
            </button>
          </div>
        </div>
      )}

      {(state === 'running' || state === 'paused') && question && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="glass-panel-elevated" style={{ padding: '20px 24px' }}>
            <div className="timer-display">{formatSeconds(remaining)}</div>
            <div className="timer-progress-track">
              <div className="timer-progress-fill" style={{ width: `${(remaining / duration) * 100}%` }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={() => setState(s => s === 'running' ? 'paused' : 'running')}>
                {state === 'running' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
              </button>
              <button className="btn btn-danger" onClick={() => setState('idle')}>
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="badge-tag badge-amber">[{question.marks} Marks]</span>
              <span className="badge-tag badge-indigo">{subject}</span>
            </div>
            <p style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-pure)', lineHeight: 1.55, marginBottom: 16 }}>{question.text}</p>
            <label className="field-label">Your Solution</label>
            <textarea
              key="timer-answer-input"
              className="textarea-field"
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              placeholder="Write your detailed answer here (supports LaTeX & diagrams)..."
              style={{ minHeight: 220 }}
            />
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={submitExam}>
              <Send size={15} /> Submit for AI Grading
            </button>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div className="glass-panel-elevated" style={{ maxWidth: 580, margin: '20px auto', padding: 32 }}>
          <div className="timer-center">
            {result ? (
              <>
                <CheckCircle2 size={44} style={{ color: 'var(--emerald)' }} />
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Grading Complete</h3>
                  <p className="text-xs text-muted">Evaluation breakdown for {subject}</p>
                </div>
                <div className="score-ring-wrap">
                  <div className="score-display">{result.awarded_score}<span style={{ fontSize: '1.2rem', opacity: 0.5 }}>/{result.target_marks}</span></div>
                  <span className="badge-tag badge-emerald">{result.percentage?.toFixed(1)}% Marks</span>
                </div>
                <div className="feedback-card" style={{ width: '100%' }}>{result.feedback}</div>
                {result.suggested_improvement && (
                  <div className="hint-card" style={{ width: '100%' }}>
                    <Lightbulb size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                    <span>{result.suggested_improvement}</span>
                  </div>
                )}
                <button className="btn btn-primary" onClick={() => setState('idle')}>
                  <RefreshCw size={15} /> New Exam Session
                </button>
              </>
            ) : (
              <>
                <Timer size={44} style={{ color: 'var(--rose)' }} />
                <h3 style={{ fontSize: '1.2rem' }}>Time's Up!</h3>
                <button className="btn btn-primary" onClick={() => setState('idle')}>Start New Exam</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================
// NAVIGATION STRUCTURE
// ============================================================
const NAV_ITEMS = [
  { id: 'qa',       label: 'Synthesize Answer', icon: Zap,          color: '#38BDF8', section: 'Core' },
  { id: 'history',  label: 'Answer History',    icon: History,       color: '#A78BFA', section: 'Core' },
  { id: 'vault',    label: 'Document Vault',    icon: FolderOpen,    color: '#FBBF24', section: 'Knowledge' },
  { id: 'bank',     label: 'Question Bank',     icon: BookMarked,    color: '#34D399', section: 'Knowledge' },
  { id: 'predict',  label: 'PYQ Predictor',     icon: TrendingUp,    color: '#FB7185', section: 'Intelligence' },
  { id: 'mock',     label: 'Mock Exam Paper',   icon: FileText,      color: '#818CF8', section: 'Intelligence' },
  { id: 'timer',    label: 'Exam Timer',        icon: Timer,         color: '#22D3EE', section: 'Intelligence' },
  { id: 'graph',    label: 'Concept Graph',     icon: GitFork,       color: '#C084FC', section: 'Intelligence' },
  { id: 'syllabus', label: 'Syllabus Tracker',  icon: Map,           color: '#4ADE80', section: 'Intelligence' },
  { id: 'planner',  label: 'Study Planner',     icon: Calendar,      color: '#60A5FA', section: 'Intelligence' },
  { id: 'practice', label: 'Practice Arena',    icon: Award,         color: '#F59E0B', section: 'Training' },
  { id: 'compare',  label: 'Comparison Mode',   icon: SplitSquareHorizontal, color: '#FB923C', section: 'Training' },
];

const SECTIONS = ['Core', 'Knowledge', 'Intelligence', 'Training'];
const TAB_LABELS = Object.fromEntries(NAV_ITEMS.map(n => [n.id, n.label]));
const subjectOptions = ['All Subjects', 'Deep Learning', 'NLP', 'Machine Learning', 'Artificial Intelligence', 'Data Science'];

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function App() {
  const [tab, setTab] = useState('qa');
  const [user, setUser] = useState(null);

  // Load current Supabase user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Subject & Server State
  const [subject, setSubject] = useState('NLP');
  const [serverOnline, setServerOnline] = useState(false);

  // QA State (Controlled directly, non-nested)
  const [question, setQuestion] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [targetMarks, setTargetMarks] = useState(10);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState(null);
  const [displayedAnswer, setDisplayedAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const typingRef = useRef(null);

  // ChatGPT-style Effort Selector Popover State
  const [effortPopoverOpen, setEffortPopoverOpen] = useState(false);
  const effortPopoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (effortPopoverRef.current && !effortPopoverRef.current.contains(event.target)) {
        if (!event.target.closest('.chatgpt-effort-trigger-btn')) {
          setEffortPopoverOpen(false);
        }
      }
    }
    if (effortPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [effortPopoverOpen]);

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Vault State
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadSubject, setUploadSubject] = useState('NLP');
  const [uploadModule, setUploadModule] = useState('');
  const [pinToVault, setPinToVault] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Bank State
  const [bank, setBank] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankFilter, setBankFilter] = useState('');

  // Intelligence Features
  const [predictions, setPredictions] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [mockExam, setMockExam] = useState(null);
  const [mockLoading, setMockLoading] = useState(false);
  const [conceptGraph, setConceptGraph] = useState(null);
  const [syllabusProgress, setSyllabusProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rad_syllabus') || '{}'); } catch { return {}; }
  });
  const [expandedModules, setExpandedModules] = useState({});
  const [studyPlan, setStudyPlan] = useState(null);
  const [completedDays, setCompletedDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rad_plan_completed') || '[]'); } catch { return []; }
  });

  // Practice State
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceResult, setPracticeResult] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(false);

  // Comparison State
  const [compareQ, setCompareQ] = useState('');
  const [compareResults, setCompareResults] = useState({});
  const [compareLoading, setCompareLoading] = useState({});

  // Toast Notification Trigger
  const toast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4200);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSpotlightOpen(o => !o);
      }
      if (e.key === 'Escape') setSpotlightOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Server health polling
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${API_BASE}/health`);
        setServerOnline(r.ok);
      } catch { setServerOnline(false); }
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, []);

  // Authenticated headers helper for multi-tenant isolation
  const getAuthHeaders = useCallback(async (includeJson = true) => {
    const headers = includeJson ? { 'Content-Type': 'application/json' } : {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (user?.id) {
        headers['X-User-Id'] = user.id;
      }
    } catch (e) {
      console.warn('[AUTH] Error obtaining session token:', e);
    }
    return headers;
  }, [user]);

  // SWR: Preload cached data per-user on initial render and user switch (0ms load time)
  useEffect(() => {
    const uid = user?.id || 'guest';
    try {
      const d = localStorage.getItem(`rad_docs_cache_${uid}`);
      if (d) setDocuments(JSON.parse(d));
      const h = localStorage.getItem(`rad_history_cache_${uid}`);
      if (h) setHistory(JSON.parse(h));
      const b = localStorage.getItem(`rad_bank_cache_${uid}`);
      if (b) setBank(JSON.parse(b));
    } catch (e) {
      console.warn('Error reading SWR cache:', e);
    }
  }, [user]);

  // Fetch Data on Tab Switch
  useEffect(() => {
    if (tab === 'vault') fetchDocuments();
    if (tab === 'bank')  fetchBank();
    if (tab === 'predict') fetchPredictions();
    if (tab === 'mock')  fetchMock();
    if (tab === 'graph') fetchConceptGraph();
    if (tab === 'planner') fetchStudyPlan();
    if (tab === 'history') fetchHistory();
  }, [tab, subject]);

  const fetchDocuments = async () => {
    if (documents.length === 0) setDocsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch(`${API_BASE}/api/v1/documents`, { headers });
      const d = await r.json();
      const docs = d.documents || [];
      setDocuments(docs);
      try {
        localStorage.setItem(`rad_docs_cache_${user?.id || 'guest'}`, JSON.stringify(docs));
      } catch {}
    } catch {
      // Keep cached documents on network error
    } finally {
      setDocsLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (history.length === 0) setHistoryLoading(true);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch(`${API_BASE}/api/v1/history`, { headers });
      const d = await r.json();
      const hist = d.history || [];
      setHistory(hist);
      try {
        localStorage.setItem(`rad_history_cache_${user?.id || 'guest'}`, JSON.stringify(hist));
      } catch {}
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchBank = async () => {
    if (bank.length === 0) setBankLoading(true);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch(`${API_BASE}/api/v1/bank`, { headers });
      const d = await r.json();
      const b = d.bank || [];
      setBank(b);
      try {
        localStorage.setItem(`rad_bank_cache_${user?.id || 'guest'}`, JSON.stringify(b));
      } catch {}
    } catch {
    } finally {
      setBankLoading(false);
    }
  };

  const fetchPredictions = async () => {
    setPredLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/v1/predict-questions?subject=${encodeURIComponent(subject)}`, { method: 'POST' });
      const d = await r.json();
      setPredictions(d);
    } catch { setPredictions(null); }
    finally { setPredLoading(false); }
  };

  const fetchMock = async () => {
    setMockLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/v1/generate-mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, total_marks: 100, duration_mins: 180 })
      });
      const d = await r.json();
      setMockExam(d);
    } catch { setMockExam(null); }
    finally { setMockLoading(false); }
  };

  const fetchConceptGraph = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/v1/concept-graph/${encodeURIComponent(subject)}`);
      const d = await r.json();
      setConceptGraph(d);
    } catch { setConceptGraph(null); }
  };

  const fetchStudyPlan = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/v1/study-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, exam_date: "2026-11-15", hours_per_day: 2.5, target_score: 90 })
      });
      const d = await r.json();
      setStudyPlan(d);
    } catch { setStudyPlan(null); }
  };

  // Typewriter Animation
  const startTypewriter = (text) => {
    if (typingRef.current) clearInterval(typingRef.current);
    setIsTyping(true);
    let i = 0;
    typingRef.current = setInterval(() => {
      i += 5;
      if (i >= text.length) {
        setDisplayedAnswer(text);
        setIsTyping(false);
        clearInterval(typingRef.current);
      } else {
        setDisplayedAnswer(text.slice(0, i));
      }
    }, 14);
  };

  const handleQASubmit = async (e, overrideQ = null, overrideMarks = null) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const qToUse = (typeof overrideQ === 'string' ? overrideQ : question).trim();
    const marksToUse = typeof overrideMarks === 'number' ? overrideMarks : targetMarks;
    if (!qToUse || qaLoading) return;
    if (overrideQ) setQuestion(overrideQ);
    if (overrideMarks) setTargetMarks(overrideMarks);
    setEffortPopoverOpen(false);
    setQaLoading(true);
    setQaResult(null);
    setDisplayedAnswer('');
    setIsTyping(true);

    let fullText = '';
    let citations = [];
    let provider = '';

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/v1/query/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: qToUse,
          subject: subject === 'All Subjects' ? null : subject,
          module_filter: moduleFilter ? parseInt(moduleFilter) : null,
          target_marks: marksToUse
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.detail || 'Synthesis failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'meta') {
              citations = event.citations || [];
              provider = event.provider || '';
            } else if (event.type === 'token') {
              fullText += event.content;
              setDisplayedAnswer(fullText);
            } else if (event.type === 'done') {
              setIsTyping(false);
            } else if (event.type === 'error') {
              throw new Error(event.content);
            }
          } catch (parseErr) {
            // ignore malformed SSE lines
          }
        }
      }

      const newResult = {
        question: qToUse,
        target_marks: marksToUse,
        generated_answer: fullText,
        citations,
        retrieval_latency_ms: 0
      };
      setQaResult(newResult);

      // Record to history optimistically
      if (fullText) {
        const histEntry = {
          id: String(Date.now()),
          question: qToUse,
          target_marks: marksToUse,
          subject,
          module_filter: moduleFilter ? parseInt(moduleFilter) : null,
          generated_answer: fullText,
          citations,
          timestamp: new Date().toISOString()
        };
        setHistory(prev => {
          const updated = [histEntry, ...prev].slice(0, 50);
          try { localStorage.setItem(`rad_history_cache_${user?.id || 'guest'}`, JSON.stringify(updated)); } catch {}
          return updated;
        });

        try {
          const addHeaders = await getAuthHeaders();
          await fetch(`${API_BASE}/api/v1/history/add`, {
            method: 'POST',
            headers: addHeaders,
            body: JSON.stringify({ question: qToUse, subject, target_marks: marksToUse, generated_answer: fullText, citations })
          });
        } catch { /* non-critical */ }
      }

    } catch (err) {
      toast(`Query error: ${err.message}`, 'error');
      const fallback = `## Error Generating Answer\n\n${err.message}\n\nPlease verify that your document is ingested into the Vault.`;
      setQaResult({ question, target_marks: targetMarks, generated_answer: fallback, citations: [], retrieval_latency_ms: 0 });
      setDisplayedAnswer(fallback);
      setIsTyping(false);
    } finally {
      setQaLoading(false);
    }
  };

  const saveToBank = async () => {
    if (!qaResult) return;
    const newItem = {
      id: String(Date.now()),
      question: qaResult.question,
      target_marks: qaResult.target_marks,
      subject,
      generated_answer: qaResult.generated_answer,
      citations: qaResult.citations,
      tags: [subject, `${targetMarks}-mark`],
      saved_at: new Date().toISOString()
    };
    // Optimistic bank update
    setBank(prev => {
      const updated = [newItem, ...prev];
      try { localStorage.setItem(`rad_bank_cache_${user?.id || 'guest'}`, JSON.stringify(updated)); } catch {}
      return updated;
    });
    toast('Saved to Question Bank', 'success');

    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/api/v1/bank/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: qaResult.question,
          target_marks: qaResult.target_marks,
          subject,
          generated_answer: qaResult.generated_answer,
          citations: qaResult.citations,
          tags: [subject, `${targetMarks}-mark`]
        })
      });
    } catch {
      toast('Background sync failed', 'error');
    }
  };

  const copyAnswer = () => {
    if (!qaResult?.generated_answer) return;
    navigator.clipboard.writeText(qaResult.generated_answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast('Answer copied to clipboard', 'success');
  };

  // Upload Handler with tenant isolation and 15MB limit check
  const handleUpload = async (e) => {
    e?.preventDefault();
    if (!selectedFile || uploading) return;

    if (selectedFile.size > 15 * 1024 * 1024) {
      toast('File exceeds 15MB upload limit. Please select a smaller PDF.', 'error');
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('subject', uploadSubject);
    if (uploadModule) fd.append('module_number', uploadModule);
    fd.append('pin_to_vault', pinToVault);
    try {
      const headers = await getAuthHeaders(false);
      const r = await fetch(`${API_BASE}/api/v1/upload-pdf`, { method: 'POST', body: fd, headers });
      const d = await r.json();
      if (r.ok) {
        toast(`Ingested "${selectedFile.name}" (${d.child_chunks} chunks)`, 'success');
        setSelectedFile(null);
        fetchDocuments();
      } else {
        toast(d.detail || 'Upload failed', 'error');
      }
    } catch (err) {
      toast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (filename) => {
    // Optimistic removal:
    const updated = documents.filter(d => d.filename !== filename);
    setDocuments(updated);
    try { localStorage.setItem(`rad_docs_cache_${user?.id || 'guest'}`, JSON.stringify(updated)); } catch {}

    try {
      const headers = await getAuthHeaders();
      const r = await fetch(`${API_BASE}/api/v1/documents/${encodeURIComponent(filename)}`, { method: 'DELETE', headers });
      if (r.ok) {
        toast(`Deleted "${filename}"`, 'success');
      } else {
        const d = await r.json();
        toast(d.detail || 'Could not delete document', 'error');
        fetchDocuments(); // Rollback if error
      }
    } catch {
      toast('Could not connect', 'error');
      fetchDocuments();
    }
  };

  const pinDocument = async (filename, currentlyPinned) => {
    const action = currentlyPinned ? 'unpin' : 'pin';
    // Optimistic pin toggle:
    const updated = documents.map(d => d.filename === filename ? { ...d, pinned: !currentlyPinned } : d);
    setDocuments(updated);
    try { localStorage.setItem(`rad_docs_cache_${user?.id || 'guest'}`, JSON.stringify(updated)); } catch {}

    try {
      const headers = await getAuthHeaders();
      const r = await fetch(`${API_BASE}/api/v1/documents/${encodeURIComponent(filename)}/${action}`, { method: 'POST', headers });
      if (r.ok) {
        toast(`${currentlyPinned ? 'Unpinned' : 'Pinned'} "${filename}"`, 'success');
      } else {
        fetchDocuments();
      }
    } catch {
      toast('Action failed', 'error');
      fetchDocuments();
    }
  };

  const deleteBankItem = async (id) => {
    // Optimistic delete from bank:
    const updated = bank.filter(b => b.id !== id);
    setBank(updated);
    try { localStorage.setItem(`rad_bank_cache_${user?.id || 'guest'}`, JSON.stringify(updated)); } catch {}
    toast('Removed from Question Bank', 'success');

    try {
      const headers = await getAuthHeaders();
      const r = await fetch(`${API_BASE}/api/v1/bank/${id}`, { method: 'DELETE', headers });
      if (!r.ok) fetchBank();
    } catch {
      toast('Could not connect', 'error');
      fetchBank();
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    try { localStorage.removeItem(`rad_history_cache_${user?.id || 'guest'}`); } catch {}
    toast('Session history cleared', 'info');

    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/api/v1/history`, { method: 'DELETE', headers });
    } catch { /* silent */ }
  };

  const handlePracticeSubmit = async () => {
    if (!practiceAnswer.trim() || practiceLoading) return;
    setPracticeLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/v1/practice/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: 'practice_q1',
          question_text: "Explain Transformer Multi-Head Attention",
          user_answer: practiceAnswer,
          target_marks: 10
        })
      });
      const d = await r.json();
      setPracticeResult(d);
    } catch {
      const words = practiceAnswer.split(/\s+/).length;
      const score = Math.min(10, Math.max(3, Math.floor(words / 15)));
      setPracticeResult({
        target_marks: 10,
        awarded_score: score,
        percentage: (score / 10) * 100,
        feedback: "Solid foundation. Good technical keywords used.",
        progressive_hints: ["Include the Softmax scaling equation", "Explain Query, Key, and Value matrix projections"],
        suggested_improvement: "Add full LaTeX derivations to reach 10/10."
      });
    } finally {
      setPracticeLoading(false);
    }
  };

  const runCompare = async () => {
    if (!compareQ.trim()) return;
    const marks = [2, 5, 10];
    setCompareResults({});
    marks.forEach(m => setCompareLoading(p => ({ ...p, [m]: true })));
    marks.forEach(async (m) => {
      try {
        const r = await fetch(`${API_BASE}/api/v1/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: compareQ, subject: subject === 'All Subjects' ? null : subject, module_filter: null, target_marks: m })
        });
        const d = await r.json();
        setCompareResults(p => ({ ...p, [m]: d.generated_answer || `Error: ${d.detail}` }));
      } catch {
        setCompareResults(p => ({ ...p, [m]: 'Could not connect to server.' }));
      } finally {
        setCompareLoading(p => ({ ...p, [m]: false }));
      }
    });
  };

  const toggleTopic = (module, topic) => {
    const key = `${module}__${topic}`;
    const updated = { ...syllabusProgress, [key]: !syllabusProgress[key] };
    setSyllabusProgress(updated);
    localStorage.setItem('rad_syllabus', JSON.stringify(updated));
  };

  const SYLLABUS_MODULES = [
    { name: "Module 1: Mathematical Foundations", topics: ["Probability Theory", "Linear Algebra", "Eigenvalues & PCA", "Bayes Decision Rule"] },
    { name: "Module 2: Classical Language Models", topics: ["N-gram Estimation", "Smoothing (Kneser-Ney)", "Perplexity Evaluation", "Zipf's Law"] },
    { name: "Module 3: Sequence Tagging", topics: ["Part-of-Speech Tagging", "HMM & Viterbi Algorithm", "Named Entity Recognition", "CRF Formulation"] },
    { name: "Module 4: Deep Neural Architectures", topics: ["Word2Vec & GloVe", "LSTM & GRU Gating", "Encoder-Decoder Seq2Seq", "Attention Mechanism"] },
    { name: "Module 5: Modern Transformers & LLMs", topics: ["Multi-Head Self-Attention", "BERT Masked Modeling", "GPT Autoregressive Architecture", "LoRA Fine-tuning"] }
  ];

  const getModuleProgress = (mod) => {
    const total = mod.topics.length;
    const done = mod.topics.filter(t => syllabusProgress[`${mod.name}__${t}`]).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const diffBadge = (d) => {
    const cls = d === 'hard' ? 'badge-tag badge-rose' : d === 'medium' ? 'badge-tag badge-amber' : 'badge-tag badge-emerald';
    return <span className={cls}>{d}</span>;
  };

  const pinnedDocs = documents.filter(d => d.pinned);
  const sessionDocs = documents.filter(d => !d.pinned);
  const filteredBank = bank.filter(i =>
    !bankFilter ||
    i.question.toLowerCase().includes(bankFilter.toLowerCase()) ||
    i.subject.toLowerCase().includes(bankFilter.toLowerCase()) ||
    i.tags?.some(t => t.toLowerCase().includes(bankFilter.toLowerCase()))
  );

  return (
    <div className="app-shell">
      <ToastStack toasts={toasts} />
      {spotlightOpen && <SpotlightOverlay onClose={() => setSpotlightOpen(false)} />}

      {mobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Titanium Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-badge-icon"><GraduationCap size={18} /></div>
          <div className="brand-titles">
            <div className="brand-main-title">RAD-UniQA</div>
            <div className="brand-sub-title">Intelligence Console</div>
          </div>
        </div>

        <div className="sidebar-subject-picker">
          {!sidebarCollapsed && <span className="sidebar-subject-label">Subject Arena</span>}
          <select className="select-field" value={subject} onChange={e => setSubject(e.target.value)} style={{ fontSize: '0.78rem', padding: '7px 10px' }}>
            {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <nav className="sidebar-nav-container">
          {SECTIONS.map(section => (
            <React.Fragment key={section}>
              <div className="nav-group-header">{section}</div>
              {NAV_ITEMS.filter(n => n.section === section).map(n => {
                const Icon = n.icon;
                const count =
                  n.id === 'vault' ? documents.length :
                  n.id === 'bank' ? bank.length :
                  n.id === 'history' ? history.length : 0;
                return (
                  <button
                    key={n.id}
                    className={`nav-link-btn ${tab === n.id ? 'active' : ''}`}
                    onClick={() => { setTab(n.id); setMobileSidebarOpen(false); }}
                  >
                    <span className="nav-btn-icon" style={{ color: n.color }}><Icon size={16} /></span>
                    <span className="nav-btn-text">{n.label}</span>
                    {count > 0 && <span className="nav-btn-badge">{count}</span>}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        {/* User Profile + Logout */}
        {!sidebarCollapsed && user && (
          <div style={{
            margin: '0 12px 8px',
            padding: '10px 12px',
            background: '#18181B',
            border: '1px solid #27272A',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 0
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#27272A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              {user.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} alt="avatar" />
                : <User size={14} style={{ color: '#71717A' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#FAFAFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.email?.split('@')[0] || 'Student'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#52525B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email || (user.user_metadata?.user_name ? `@${user.user_metadata.user_name}` : 'Authenticated')}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', padding: '2px', display: 'flex', flexShrink: 0 }}
              onMouseOver={e => e.currentTarget.style.color = '#EF4444'}
              onMouseOut={e => e.currentTarget.style.color = '#52525B'}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        <div className="sidebar-footer-bar">
          <div className="server-status-pill">
            <div className="pulse-dot" />
            <span>{serverOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button className="collapse-toggle-btn" onClick={() => setSidebarCollapsed(c => !c)} title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
            {sidebarCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-breadcrumbs">
            <button className="btn btn-ghost btn-icon-square" style={{ display: 'none' }} id="mobile-menu-btn" onClick={() => setMobileSidebarOpen(o => !o)}>
              <Menu size={16} />
            </button>
            <span>RAD-UniQA</span>
            <span style={{ color: 'var(--text-dim)' }}>/</span>
            <span className="breadcrumb-active-tag">{TAB_LABELS[tab]}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="spotlight-search-trigger" onClick={() => setSpotlightOpen(true)}>
              <Search size={14} />
              <span>Search knowledge...</span>
              <span className="kbd-shortcut">Ctrl K</span>
            </button>
          </div>
        </header>

        <main className="page-content">
          {/* TAB 1: SYNTHESIZE ANSWER (CHATGPT CONVERSATIONAL WORKSPACE) */}
          {tab === 'qa' && (
            <div className="tab-content chatgpt-qa-container">
              {/* Central Stream Area */}
              <div className="chatgpt-stream-scroll">
                <div className="chatgpt-stream-content">

                  {/* Empty Hero State (Before Asking Query) */}
                  {!displayedAnswer && !qaLoading && (
                    <div className="chatgpt-hero-landing">
                      <div className="chatgpt-hero-icon">
                        <Zap size={26} />
                      </div>
                      <h2 className="chatgpt-hero-title">What university question are we solving today?</h2>
                      <p className="chatgpt-hero-subtitle">
                        Exam-calibrated synthesis with step-by-step LaTeX math, structured tables, and citations from your university course documents.
                      </p>

                      <div className="chatgpt-suggestions-grid">
                        {[
                          { q: 'Explain SVM dual optimization formulation and KKT slack conditions.', marks: 10, tag: '10 Marks' },
                          { q: 'Compare TCP Reno vs Tahoe congestion avoidance mechanisms with phase comparison.', marks: 5, tag: '5 Marks' },
                          { q: 'Derive Backpropagation gradient weight updates for a 2-layer neural network.', marks: 10, tag: '10 Marks' },
                          { q: 'State Dynamic Programming optimal substructure and overlapping subproblems.', marks: 2, tag: '2 Marks' }
                        ].map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="chatgpt-suggestion-card"
                            onClick={() => {
                              setQuestion(s.q);
                              setTargetMarks(s.marks);
                              handleQASubmit(null, s.q, s.marks);
                            }}
                          >
                            <span className="suggestion-text">{s.q}</span>
                            <div className="suggestion-footer">
                              <span className="suggestion-badge">{s.tag}</span>
                              <span className="suggestion-arrow">→</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading State Skeleton */}
                  {qaLoading && !displayedAnswer && (
                    <div className="chatgpt-turn assistant-turn">
                      <div className="turn-avatar ai-avatar"><Sparkles size={16} /></div>
                      <div style={{ flex: 1 }}>
                        <div className="chatgpt-thinking-pill" style={{ marginBottom: 14 }}>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Searching Qdrant dense vectors & synthesizing {targetMarks}-mark response...</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {[88, 72, 94, 60, 80].map((w, i) => (
                            <div key={i} className="skeleton" style={{ height: 14, width: `${w}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Answer Thread */}
                  {displayedAnswer && (
                    <div className="chatgpt-conversation-thread">
                      {/* User Turn */}
                      <div className="chatgpt-turn user-turn">
                        <div className="turn-avatar user-avatar"><User size={16} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '85%' }}>
                          <div className="user-question-bubble">
                            {qaResult?.question || question}
                          </div>
                          <div className="user-turn-meta">
                            <span className="badge-tag badge-cyan">{targetMarks} Marks</span>
                            {moduleFilter && <span className="badge-tag badge-indigo">Module {moduleFilter}</span>}
                            <span className="badge-tag">{subject}</span>
                          </div>
                        </div>
                      </div>

                      {/* Assistant Turn: Main Answer + Outputs & Sources Sidebar (Matching Screenshot) */}
                      <div className="chatgpt-response-layout">
                        {/* Main Synthesized Answer */}
                        <div className="main-answer-card">
                          <div className="turn-header-row">
                            <div className="turn-avatar ai-avatar"><Sparkles size={16} /></div>
                            <div className="chatgpt-thinking-pill">
                              <Zap size={13} style={{ color: '#06B6D4' }} />
                              <span>Synthesized {targetMarks}-Mark Solution {qaResult?.retrieval_latency_ms ? `· ${qaResult.retrieval_latency_ms}ms` : ''}</span>
                            </div>
                            {isTyping && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>streaming...</span>}
                          </div>

                          <div className="answer-prose">
                            <RenderMarkdown text={displayedAnswer} />
                            {isTyping && <span className="typewriter-cursor" />}
                          </div>

                          {/* Toolbar Actions */}
                          <div className="chatgpt-actions-toolbar">
                            <button className="chatgpt-action-btn" onClick={copyAnswer} title="Copy Answer">
                              {copied ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                              <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button className="chatgpt-action-btn" onClick={() => window.print()} title="Print as PDF">
                              <Printer size={14} />
                              <span>Print PDF</span>
                            </button>
                            <button className="chatgpt-action-btn" onClick={saveToBank} title="Save to Question Bank">
                              <BookMarked size={14} />
                              <span>Save to Bank</span>
                            </button>
                            {isTyping && (
                              <button className="chatgpt-action-btn" onClick={() => { clearInterval(typingRef.current); setDisplayedAnswer(qaResult?.generated_answer || displayedAnswer); setIsTyping(false); }}>
                                <span>Skip Typing</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Right Sidebar: Outputs & Sources (Exact Screenshot Design) */}
                        <aside className="chatgpt-sidebar-panel">
                          {/* Outputs Card */}
                          <div className="chatgpt-side-section">
                            <div className="side-section-header">
                              <span>Outputs</span>
                              <span style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>2 items</span>
                            </div>
                            <div className="side-item-list">
                              <div className="side-item-card" onClick={() => window.print()} title="Print / Export Solution PDF">
                                <FileText size={15} className="side-icon-pdf" />
                                <div className="side-item-info">
                                  <span className="side-item-title">{`Solution_${targetMarks}M_${subject}.pdf`}</span>
                                  <span className="side-item-sub">Ready to print</span>
                                </div>
                              </div>
                              <div className="side-item-card" onClick={saveToBank} title="Save question & answer to question bank">
                                <BookMarked size={15} className="side-icon-doc" />
                                <div className="side-item-info">
                                  <span className="side-item-title">Question_Bank_Entry</span>
                                  <span className="side-item-sub">Revision Deck</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Sources Card */}
                          <div className="chatgpt-side-section">
                            <div className="side-section-header">
                              <span>Sources ({qaResult?.citations?.length || 0})</span>
                              <span className="side-section-badge">Grounding</span>
                            </div>
                            <div className="side-item-list">
                              {qaResult?.citations && qaResult.citations.length > 0 ? (
                                qaResult.citations.map((c, i) => (
                                  <div key={i} className="side-item-card" title={`${c.source} · Module ${c.module_number || 1} · Page ${c.page_number || 1}`}>
                                    <FileText size={15} className="side-icon-source" />
                                    <div className="side-item-info">
                                      <span className="side-item-title">{c.source}</span>
                                      <span className="side-item-sub">
                                        {c.module_number ? `Mod ${c.module_number}` : 'Notes'} {c.page_number ? `· p.${c.page_number}` : ''}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="side-item-card empty">
                                  <span className="side-item-sub">University syllabus reference</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </aside>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Fixed Bottom Input Bar (ChatGPT-style!) */}
              <div className="chatgpt-bottom-bar-container">
                <div className="chatgpt-input-box">

                  {/* Floating Horizontal Effort Slider Popover (Exact Match to Screenshot!) */}
                  {effortPopoverOpen && (
                    <div className="chatgpt-effort-popover" ref={effortPopoverRef}>
                      <div className="popover-top-row">
                        <Zap size={16} className="popover-zap-icon" />
                        <div className="popover-level-info">
                          <span className="popover-level-title">
                            {targetMarks === 2 ? 'Low' : targetMarks === 5 ? 'Medium' : 'High'}
                          </span>
                          <span className="popover-level-sub">
                            {targetMarks === 2 && '2 Marks · Quick Definition'}
                            {targetMarks === 5 && '5 Marks · Concept Breakdown'}
                            {targetMarks === 10 && '10 Marks · Deep Derivation'}
                            {' >'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="popover-reset-btn"
                          title="Reset to 5 Marks"
                          onClick={() => setTargetMarks(5)}
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>

                      {/* Horizontal Slider Track with dots and circular thumb */}
                      <div className="popover-slider-wrapper">
                        <div
                          className="popover-track-bar"
                          onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const ratio = clickX / rect.width;
                            if (ratio < 0.33) setTargetMarks(2);
                            else if (ratio < 0.67) setTargetMarks(5);
                            else setTargetMarks(10);
                          }}
                        >
                          {/* Filled progress bar */}
                          <div
                            className="popover-track-fill"
                            style={{
                              width: targetMarks === 2 ? '0%' : targetMarks === 5 ? '50%' : '100%'
                            }}
                          />
                          {/* White circular slider thumb knob */}
                          <div
                            className="popover-slider-thumb"
                            style={{
                              left: targetMarks === 2 ? '0%' : targetMarks === 5 ? '50%' : '100%'
                            }}
                          />
                        </div>

                        {/* Discrete level stops */}
                        <div className="popover-stops-row">
                          {[
                            { marks: 2, label: 'Low', sub: '2M' },
                            { marks: 5, label: 'Medium', sub: '5M' },
                            { marks: 10, label: 'High', sub: '10M' }
                          ].map(tier => (
                            <button
                              key={tier.marks}
                              type="button"
                              className={`popover-stop-btn ${targetMarks === tier.marks ? 'active' : ''}`}
                              onClick={() => setTargetMarks(tier.marks)}
                            >
                              <span className="stop-dot" />
                              <span className="stop-name">{tier.label} ({tier.sub})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Query Textarea */}
                  <textarea
                    key="chatgpt-qa-input"
                    className="chatgpt-textarea"
                    placeholder="Ask any university exam question... (Enter to send, Shift+Enter for newline)"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleQASubmit();
                      }
                    }}
                    rows={question.split('\n').length > 2 ? Math.min(question.split('\n').length, 5) : 2}
                  />

                  {/* Input Footer Controls */}
                  <div className="chatgpt-input-footer">
                    {/* Left Tools: Subject & Module */}
                    <div className="chatgpt-input-tools-left">
                      <div className="chatgpt-pill-tool" title="Active Subject">
                        <BookOpen size={12} />
                        <span>{subject}</span>
                      </div>
                      <div className="chatgpt-module-selector" title="Filter by Module">
                        <span>Mod:</span>
                        <select
                          className="chatgpt-module-select"
                          value={moduleFilter}
                          onChange={e => setModuleFilter(e.target.value)}
                        >
                          <option value="">All</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(m => (
                            <option key={m} value={m}>M{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right Tools: Compact Effort Selector Pill + Send Button */}
                    <div className="chatgpt-input-tools-right">
                      {/* Compact Effort Selector Trigger */}
                      <button
                        type="button"
                        className={`chatgpt-effort-trigger-btn ${effortPopoverOpen ? 'active' : ''}`}
                        onClick={() => setEffortPopoverOpen(o => !o)}
                        title="Select Reasoning Effort & Target Marks"
                      >
                        <Zap size={13} className="trigger-zap-icon" />
                        <span className="trigger-text">
                          {targetMarks === 2 ? 'Low · 2M' : targetMarks === 5 ? 'Medium · 5M' : 'High · 10M'}
                        </span>
                        <ChevronDown size={13} className={`trigger-chevron ${effortPopoverOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Send Button */}
                      <button
                        type="button"
                        className="chatgpt-send-btn"
                        onClick={handleQASubmit}
                        disabled={qaLoading || !question.trim()}
                        title="Synthesize Answer (Enter)"
                      >
                        {qaLoading ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                </div>

                <div className="chatgpt-disclaimer">
                  Eduniti AI may produce approximations · Verify key derivations with official university notes
                </div>
              </div>
            </div>
          )}


          {/* TAB 2: ANSWER HISTORY */}
          {tab === 'history' && (
            <div className="tab-content">
              <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 className="page-title gradient-title">Answer History</h2>
                  <p className="page-subtitle">Chronological record of answers generated during this session.</p>
                </div>
                {history.length > 0 && (
                  <button className="btn btn-danger" onClick={clearHistory}><Trash2 size={14} /> Clear Session</button>
                )}
              </div>

              {selectedHistoryItem ? (
                <div>
                  <button className="btn btn-ghost mb-3" onClick={() => setSelectedHistoryItem(null)}>
                    <ArrowLeft size={14} /> Back to History
                  </button>
                  <div className="glass-panel-elevated">
                    <div className="answer-toolbar">
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{selectedHistoryItem.question}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="badge-tag badge-indigo">{selectedHistoryItem.target_marks} Marks</span>
                        <span className="badge-tag badge-cyan">{selectedHistoryItem.latency_ms}ms</span>
                      </div>
                    </div>
                    <div className="answer-body">
                      <RenderMarkdown text={selectedHistoryItem.generated_answer} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {historyLoading && [1,2,3].map(i => <SkeletonCard key={i} lines={2} />)}
                  {!historyLoading && history.length === 0 && (
                    <div className="glass-panel-inset text-center text-xs text-muted" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <History size={16} style={{ color: '#A78BFA' }} />
                      <span>No answers synthesized yet — run your first query in Synthesize Answer</span>
                    </div>
                  )}
                  {history.map((item, idx) => (
                    <div key={item.id} className="glass-panel card-hover-effect" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setSelectedHistoryItem(item)}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', minWidth: 26 }}>#{history.length - idx}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-pure)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.question}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <span className="badge-tag badge-indigo">{item.target_marks}M</span>
                          <span className="badge-tag badge-cyan">{item.subject}</span>
                          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {item.latency_ms}ms</span>
                          <span style={{ fontSize: '0.70rem', color: 'var(--text-dim)' }}>{item.timestamp?.slice(11, 16)}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DOCUMENT VAULT */}
          {tab === 'vault' && (
            <div className="tab-content">
              <div className="page-header">
                <h2 className="page-title gradient-title">Document Vault</h2>
                <p className="page-subtitle">Pinned documents persist across restarts. Session uploads are auto-cleaned on next server launch.</p>
              </div>

              <div className="glass-panel-elevated" style={{ padding: 22, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <UploadCloud size={18} style={{ color: '#FAFAFA' }} />
                  <span style={{ fontSize: '0.90rem', fontWeight: 700 }}>Upload University PDF</span>
                </div>
                <div
                  className={`dropzone ${dragOver ? 'drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.pdf')) setSelectedFile(f); }}
                >
                  <div className="dropzone-icon"><FileUp size={22} /></div>
                  {selectedFile ? (
                    <div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FAFAFA' }}>{selectedFile.name}</p>
                      <p className="text-xs text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>Drop PDF notes/PYQs here, or click to browse</p>
                      <p className="text-xs text-muted">Only verified .pdf formats supported</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                </div>

                {selectedFile && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label className="field-label">Subject</label>
                      <select className="select-field" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)}>
                        {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <label className="field-label">Module</label>
                      <input className="input-field" type="number" placeholder="Optional" value={uploadModule} onChange={e => setUploadModule(e.target.value)} min={1} max={8} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.80rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                      <input type="checkbox" checked={pinToVault} onChange={e => setPinToVault(e.target.checked)} style={{ accentColor: '#FAFAFA' }} />
                      <Pin size={14} /> Pin to Vault
                    </label>
                    <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                      {uploading ? <RefreshCw size={15} className="animate-spin" /> : <FileCheck size={15} />}
                      {uploading ? 'Ingesting PDF...' : 'Ingest Document'}
                    </button>
                  </div>
                )}
              </div>

              <div className="vault-section-title">
                <Pin size={14} style={{ color: 'var(--amber-light)' }} />
                Pinned to Vault ({pinnedDocs.length})
              </div>
              <div className="vault-grid">
                {docsLoading && [1,2].map(i => <SkeletonCard key={i} lines={3} />)}
                {!docsLoading && pinnedDocs.length === 0 && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <div className="glass-panel-inset text-center text-xs text-muted" style={{ padding: 18 }}>No pinned documents — pin a document to preserve it after restarts</div>
                  </div>
                )}
                {pinnedDocs.map(doc => (
                  <div key={doc.filename} className="glass-panel vault-card card-hover-effect">
                    <div className="vault-card-top">
                      <div className="vault-file-icon"><FileText size={18} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="vault-filename" title={doc.filename}>{doc.filename}</div>
                        <div className="pin-indicator"><Pin size={10} /> Pinned</div>
                      </div>
                    </div>
                    <div className="vault-meta-row">
                      <span className="badge-tag badge-indigo">{doc.subject}</span>
                      {doc.module_number && <span className="badge-tag badge-violet">M{doc.module_number}</span>}
                      {doc.size_kb && <span className="badge-tag badge-cyan">{doc.size_kb} KB</span>}
                    </div>
                    <div className="vault-actions">
                      <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '4px 10px' }} onClick={() => pinDocument(doc.filename, true)}>
                        <PinOff size={13} /> Unpin
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: '0.72rem', padding: '4px 10px' }} onClick={() => { if (confirm(`Delete "${doc.filename}"?`)) deleteDocument(doc.filename); }}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="vault-section-title">
                <Clock size={14} style={{ color: 'var(--cyan-light)' }} />
                Session Uploads ({sessionDocs.length})
              </div>
              <div className="vault-grid">
                {!docsLoading && sessionDocs.length === 0 && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <div className="glass-panel-inset text-center text-xs text-muted" style={{ padding: 18 }}>No session uploads</div>
                  </div>
                )}
                {sessionDocs.map(doc => (
                  <div key={doc.filename} className="glass-panel vault-card card-hover-effect">
                    <div className="vault-card-top">
                      <div className="vault-file-icon"><FileText size={18} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="vault-filename" title={doc.filename}>{doc.filename}</div>
                      </div>
                    </div>
                    <div className="vault-meta-row">
                      <span className="badge-tag badge-indigo">{doc.subject}</span>
                      {doc.module_number && <span className="badge-tag badge-violet">M{doc.module_number}</span>}
                      {doc.size_kb && <span className="badge-tag badge-cyan">{doc.size_kb} KB</span>}
                    </div>
                    <div className="vault-actions">
                      <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '4px 10px' }} onClick={() => pinDocument(doc.filename, false)}>
                        <Pin size={13} /> Pin
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: '0.72rem', padding: '4px 10px' }} onClick={() => { if (confirm(`Delete "${doc.filename}"?`)) deleteDocument(doc.filename); }}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUESTION BANK */}
          {tab === 'bank' && (
            <div className="tab-content">
              <div className="page-header">
                <h2 className="page-title gradient-title">Question Bank</h2>
                <p className="page-subtitle">Your persistent personal repository of curated questions and answers.</p>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input-field" placeholder="Search saved questions and tags..." value={bankFilter} onChange={e => setBankFilter(e.target.value)} style={{ paddingLeft: 36 }} />
                </div>
                <span className="badge-tag badge-indigo">{bank.length} Saved</span>
              </div>
              <div className="bank-grid">
                {bankLoading && [1,2,3].map(i => <SkeletonCard key={i} lines={4} />)}
                {!bankLoading && filteredBank.length === 0 && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <div className="glass-panel-inset text-center text-xs text-muted" style={{ padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <BookMarked size={16} style={{ color: '#34D399' }} />
                      <span>No questions saved yet — click bookmark on any synthesized answer</span>
                    </div>
                  </div>
                )}
                {filteredBank.map(item => (
                  <div key={item.id} className="glass-panel bank-card card-hover-effect">
                    <div className="bank-question">{item.question}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <span className="badge-tag badge-indigo">{item.subject}</span>
                      <span className="badge-tag badge-amber">{item.target_marks} Marks</span>
                    </div>
                    <div className="bank-footer">
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.saved_at?.slice(0, 10)}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-icon-square" onClick={() => { navigator.clipboard.writeText(item.generated_answer); toast('Copied to clipboard', 'success'); }} title="Copy answer">
                          <Copy size={13} />
                        </button>
                        <button className="btn btn-danger btn-icon-square" onClick={() => deleteBankItem(item.id)} title="Remove">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PYQ PREDICTOR */}
          {tab === 'predict' && (
            <div className="tab-content">
              <div className="page-header">
                <h2 className="page-title gradient-title">PYQ Predictor</h2>
                <p className="page-subtitle">Recurrence frequency and weighting forecasting for upcoming {subject} examinations.</p>
              </div>
              {predLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1,2,3].map(i => <SkeletonCard key={i} lines={3} />)}</div>}
              {predictions && !predLoading && (
                <>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div className="badge-tag badge-emerald" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                      <Activity size={13} /> Confidence: {Math.round(predictions.confidence_score * 100)}%
                    </div>
                    <div className="badge-tag badge-indigo" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                      <Target size={13} /> Predictions: {predictions.predictions?.length}
                    </div>
                  </div>
                  {predictions.predictions?.map((p, i) => (
                    <div key={i} className="glass-panel prediction-card card-hover-effect">
                      <div className="prediction-header">
                        <div className="prediction-question">{p.question}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                          {diffBadge(p.difficulty)}
                          <span className="badge-tag badge-emerald"><Flame size={11} /> {p.confidence}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge-tag badge-violet">{p.topic}</span>
                        <span className="badge-tag badge-cyan">{p.question_type}</span>
                        {p.similar_years?.map(y => <span key={y} className="badge-tag badge-indigo">{y}</span>)}
                      </div>
                      <p className="prediction-meta">{p.reasoning}</p>
                      {p.study_tip && (
                        <div className="hint-card">
                          <Lightbulb size={14} style={{ color: 'var(--amber-light)', marginTop: 1, flexShrink: 0 }} />
                          <span>{p.study_tip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* TAB 6: MOCK EXAM PAPER */}
          {tab === 'mock' && (
            <div className="tab-content">
              <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 className="page-title gradient-title">Mock Examination Paper</h2>
                  <p className="page-subtitle">Standard 100-mark university pattern paper for {subject}.</p>
                </div>
                <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={15} /> Print Paper</button>
              </div>
              {mockLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1,2,3].map(i => <SkeletonCard key={i} lines={4} />)}</div>}
              {mockExam && !mockLoading && (
                <>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                    <span className="badge-tag badge-indigo"><BookOpen size={12} /> {mockExam.subject}</span>
                    <span className="badge-tag badge-cyan"><Target size={12} /> {mockExam.total_marks} Marks</span>
                    <span className="badge-tag badge-amber"><Clock size={12} /> {mockExam.duration_mins} Mins</span>
                  </div>
                  {mockExam.sections?.map((sec, si) => (
                    <div key={si} className="glass-panel" style={{ padding: 18, marginBottom: 16 }}>
                      <div style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--indigo-light)', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)' }}>
                        {sec.section_name}
                      </div>
                      {sec.questions?.map((q, qi) => (
                        <div key={qi} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: qi < sec.questions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--cyan-light)', minWidth: 54 }}>{q.q_num}</span>
                          <span style={{ flex: 1, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{q.text}</span>
                          <span className="badge-tag badge-amber">[{q.marks}M]</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* TAB 7: EXAM TIMER WORKSPACE */}
          {tab === 'timer' && (
            <ExamTimerWorkspace subject={subject} toast={toast} />
          )}

          {/* TAB 8: CONCEPT GRAPH */}
          {tab === 'graph' && (
            <div className="tab-content">
              <div className="page-header">
                <h2 className="page-title gradient-title">Concept Dependency Graph</h2>
                <p className="page-subtitle">Prerequisite relationships and mastery progression for {subject}.</p>
              </div>
              {conceptGraph && (
                <>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Recommended Learning Path</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 24 }}>
                    {conceptGraph.learning_path?.map((node, i) => (
                      <React.Fragment key={i}>
                        <span className="badge-tag badge-indigo" style={{ padding: '6px 14px', fontSize: '0.80rem' }}>{node}</span>
                        {i < conceptGraph.learning_path.length - 1 && <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />}
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Core Concepts</div>
                  {conceptGraph.nodes?.map((node, i) => {
                    const diffColor = node.difficulty === 'hard' ? 'var(--rose)' : node.difficulty === 'medium' ? 'var(--amber)' : 'var(--emerald)';
                    return (
                      <div key={i} className="graph-node">
                        <div className="graph-node-dot" style={{ background: diffColor, boxShadow: `0 0 8px ${diffColor}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-pure)' }}>{node.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{node.category}</div>
                        </div>
                        {diffBadge(node.difficulty)}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* TAB 9: SYLLABUS TRACKER */}
          {tab === 'syllabus' && (
            <div className="tab-content">
              <div className="page-header">
                <h2 className="page-title gradient-title">Syllabus Tracker</h2>
                <p className="page-subtitle">Track your topic mastery. Checklists are stored locally in your browser.</p>
              </div>
              {(() => {
                const overallDone = SYLLABUS_MODULES.reduce((sum, m) => sum + m.topics.filter(t => syllabusProgress[`${m.name}__${t}`]).length, 0);
                const overallTotal = SYLLABUS_MODULES.reduce((sum, m) => sum + m.topics.length, 0);
                const pct = Math.round((overallDone / overallTotal) * 100);
                return (
                  <>
                    <div className="glass-panel" style={{ padding: 18, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>Overall Course Completion</span>
                          <span className="badge-tag badge-emerald">{pct}%</span>
                        </div>
                        <div className="syllabus-progress-bar">
                          <div className="syllabus-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="badge-tag badge-indigo" style={{ padding: '6px 12px' }}>{overallDone}/{overallTotal} Topics</span>
                    </div>
                    {SYLLABUS_MODULES.map((mod, mi) => {
                      const prog = getModuleProgress(mod);
                      const expanded = expandedModules[mi];
                      return (
                        <div key={mi} className="syllabus-module">
                          <div className="syllabus-module-header" onClick={() => setExpandedModules(p => ({ ...p, [mi]: !p[mi] }))}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{mod.name}</span>
                                <span className="badge-tag badge-emerald">{prog}%</span>
                              </div>
                              <div className="syllabus-progress-bar">
                                <div className="syllabus-progress-fill" style={{ width: `${prog}%` }} />
                              </div>
                            </div>
                            <div style={{ marginLeft: 14, color: 'var(--text-muted)' }}>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                          </div>
                          {expanded && mod.topics.map((topic, ti) => {
                            const key = `${mod.name}__${topic}`;
                            const done = syllabusProgress[key];
                            return (
                              <div key={ti} className={`syllabus-topic ${done ? 'done' : ''}`} onClick={() => toggleTopic(mod.name, topic)}>
                                <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${done ? 'var(--emerald)' : 'var(--border-strong)'}`, background: done ? 'var(--emerald-dim)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {done && <Check size={12} style={{ color: 'var(--emerald)' }} />}
                                </div>
                                <span>{topic}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 10: STUDY PLANNER */}
          {tab === 'planner' && (
            <div className="tab-content">
              <div className="page-header">
                <h2 className="page-title gradient-title">Dynamic Study Planner</h2>
                <p className="page-subtitle">Target-oriented 7-day revision itinerary tailored for {subject}.</p>
              </div>
              {studyPlan?.plan?.map((day, i) => {
                const done = completedDays.includes(day.day);
                return (
                  <div key={i} className={`planner-day-card glass-panel ${done ? 'completed' : ''}`} onClick={() => {
                    const updated = done ? completedDays.filter(d => d !== day.day) : [...completedDays, day.day];
                    setCompletedDays(updated);
                    localStorage.setItem('rad_plan_completed', JSON.stringify(updated));
                  }}>
                    <div className="planner-day-num" style={{ background: done ? 'var(--emerald-dim)' : '#18181B', color: done ? 'var(--emerald-light)' : '#FAFAFA' }}>
                      {done ? <Check size={16} /> : `D${day.day}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-pure)', marginBottom: 2 }}>{day.topic}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <Clock size={12} /> {day.hours} Hours Revision
                      </div>
                      {day.tasks?.map((task, ti) => (
                        <div key={ti} className={`task-row ${done ? 'done' : ''}`}>
                          <ChevronRight size={12} style={{ color: '#71717A', flexShrink: 0 }} />
                          {task}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 11: PRACTICE ARENA */}
          {tab === 'practice' && (
            <div className="tab-content">
              <div className="page-header">
                <h2 className="page-title gradient-title">Practice Arena</h2>
                <p className="page-subtitle">Submit written answers and receive automated mark breakdown with progressive hints.</p>
              </div>
              <div className="qa-grid">
                <div className="glass-panel-elevated" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="glass-panel-inset" style={{ padding: 14 }}>
                    <span className="badge-tag badge-amber" style={{ marginBottom: 6 }}>10-Mark Question</span>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-pure)', lineHeight: 1.5 }}>
                      Explain the Transformer Multi-Head Self-Attention mechanism with mathematical formulation and architecture block diagram.
                    </p>
                  </div>
                  <div>
                    <label className="field-label">Your Solution</label>
                    <textarea
                      key="practice-answer-input"
                      className="textarea-field"
                      value={practiceAnswer}
                      onChange={e => setPracticeAnswer(e.target.value)}
                      placeholder="Write your answer here..."
                      style={{ minHeight: 200 }}
                    />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handlePracticeSubmit} disabled={practiceLoading || !practiceAnswer.trim()}>
                    {practiceLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    {practiceLoading ? 'Grading Response...' : 'Submit for Evaluation'}
                  </button>
                </div>

                {practiceResult ? (
                  <div className="glass-panel-elevated" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="score-display">{practiceResult.awarded_score}<span style={{ fontSize: '1.2rem', opacity: 0.5 }}>/{practiceResult.target_marks}</span></div>
                      <span className="badge-tag badge-emerald" style={{ marginTop: 6 }}>{practiceResult.percentage?.toFixed(1)}% Marks Awarded</span>
                    </div>
                    <div className="feedback-card">{practiceResult.feedback}</div>
                    {practiceResult.progressive_hints?.length > 0 && (
                      <>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Progressive Hints</div>
                        {practiceResult.progressive_hints.map((h, i) => (
                          <div key={i} className="hint-card">
                            <div className="hint-num">{i + 1}</div>
                            <span>{h}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="glass-panel-inset text-center text-xs text-muted" style={{ padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div className="empty-icon" style={{ width: 38, height: 38 }}><Award size={16} style={{ color: '#F59E0B' }} /></div>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FAFAFA' }}>Submit your answer to see AI evaluation</p>
                    <p style={{ fontSize: '0.78rem', color: '#71717A' }}>Receive automated mark breakdown and progressive hints</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 12: COMPARISON MODE */}
          {tab === 'compare' && (
            <div className="tab-content">
              <div className="page-header">
                <h2 className="page-title gradient-title">Mark Comparison Studio</h2>
                <p className="page-subtitle">Inspect how identical questions scale in depth across 2-mark, 5-mark, and 10-mark syntheses.</p>
              </div>
              <div className="glass-panel-elevated" style={{ padding: 18, marginBottom: 18 }}>
                <label className="field-label">Comparison Question</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <textarea
                    key="compare-question-box"
                    className="textarea-field"
                    value={compareQ}
                    onChange={e => setCompareQ(e.target.value)}
                    placeholder="Enter question (e.g. Compare Decision Trees vs Random Forests)..."
                    style={{ minHeight: 65, flex: 1 }}
                  />
                  <button className="btn btn-primary" onClick={runCompare} disabled={!compareQ.trim() || Object.values(compareLoading).some(Boolean)} style={{ alignSelf: 'flex-end' }}>
                    {Object.values(compareLoading).some(Boolean) ? <RefreshCw size={15} className="animate-spin" /> : <SplitSquareHorizontal size={15} />}
                    Run Comparison
                  </button>
                </div>
              </div>
              <div className="compare-grid">
                {[2, 5, 10].map(m => (
                  <div key={m} className="glass-panel-elevated" style={{ overflow: 'hidden' }}>
                    <div className="compare-col-header">
                      <span className="badge-tag badge-amber">{m} Marks Answer</span>
                    </div>
                    <div className="answer-body">
                      {compareLoading[m] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[70, 90, 55, 80].map((w, i) => <div key={i} className="skeleton" style={{ height: 13, width: `${w}%` }} />)}
                        </div>
                      )}
                      {compareResults[m] && !compareLoading[m] && <RenderMarkdown text={compareResults[m]} />}
                      {!compareResults[m] && !compareLoading[m] && (
                        <div className="empty-state"><p className="text-xs text-muted">Click Run Comparison to preview {m}-mark answer</p></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
