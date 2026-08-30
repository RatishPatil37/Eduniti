import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: 'Instant Answer Synthesis',
    desc: 'Ask any exam question, get a structured academic answer in seconds. Grounded in your own uploaded syllabus notes.'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: 'PYQ Predictor',
    desc: 'AI predicts high-probability questions from past year papers. Know what to focus on before your exam.'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: 'LaTeX Math Rendering',
    desc: 'Every equation, derivation, and formula is rendered with professional KaTeX quality — readable and exam-ready.'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    title: 'Concept Graph',
    desc: 'Visualize subject knowledge as an interactive graph. Understand topic dependencies and build your study path.'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
      </svg>
    ),
    title: 'Timed Mock Exams',
    desc: 'Full mock papers with exam-mode timer. Practice under real exam conditions and get instant scores.'
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14,2 14,8 20,8" />
      </svg>
    ),
    title: 'Document Vault',
    desc: 'Upload your syllabus PDFs, question papers, and notes. The RAG system indexes everything for instant retrieval.'
  }
];

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090B',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      color: '#FAFAFA',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2rem;
          border-bottom: 1px solid #18181B;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(9, 9, 11, 0.9);
          backdrop-filter: blur(8px);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .nav-logo-icon {
          width: 32px;
          height: 32px;
          background: #FAFAFA;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-logo-name {
          font-size: 1rem;
          font-weight: 700;
          color: #FAFAFA;
          letter-spacing: -0.02em;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-ghost {
          padding: 0.4375rem 1rem;
          background: transparent;
          border: 1px solid #27272A;
          border-radius: 8px;
          color: #A1A1AA;
          font-size: 0.8125rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s ease;
          font-family: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }

        .btn-ghost:hover {
          background: #18181B;
          color: #FAFAFA;
          border-color: #3F3F46;
        }

        .btn-primary {
          padding: 0.4375rem 1rem;
          background: #FAFAFA;
          border: none;
          border-radius: 8px;
          color: #09090B;
          font-size: 0.8125rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
          font-family: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
        }

        .btn-primary:hover {
          background: #E4E4E7;
        }

        .hero {
          max-width: 780px;
          margin: 0 auto;
          padding: 6rem 2rem 4rem;
          text-align: center;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.3125rem 0.75rem;
          border: 1px solid #27272A;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #71717A;
          margin-bottom: 2rem;
          background: #18181B;
        }

        .hero-badge-dot {
          width: 6px;
          height: 6px;
          background: #22C55E;
          border-radius: 50%;
        }

        .hero-title {
          font-size: clamp(2.25rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.04em;
          color: #FAFAFA;
          margin-bottom: 1.25rem;
        }

        .hero-title span {
          color: #71717A;
        }

        .hero-desc {
          font-size: 1.0625rem;
          color: #71717A;
          line-height: 1.7;
          max-width: 560px;
          margin: 0 auto 2.5rem;
        }

        .hero-ctas {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-hero-primary {
          padding: 0.6875rem 1.5rem;
          background: #FAFAFA;
          border: none;
          border-radius: 8px;
          color: #09090B;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
          font-family: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-hero-primary:hover {
          background: #E4E4E7;
          transform: translateY(-1px);
        }

        .btn-hero-ghost {
          padding: 0.6875rem 1.5rem;
          background: transparent;
          border: 1px solid #27272A;
          border-radius: 8px;
          color: #A1A1AA;
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s ease;
          font-family: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .btn-hero-ghost:hover {
          background: #18181B;
          color: #FAFAFA;
          border-color: #3F3F46;
        }

        .section-divider {
          width: 100%;
          height: 1px;
          background: #18181B;
        }

        .features-section {
          max-width: 1100px;
          margin: 0 auto;
          padding: 5rem 2rem;
        }

        .section-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #52525B;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #FAFAFA;
          text-align: center;
          margin-bottom: 0.75rem;
        }

        .section-desc {
          font-size: 0.9375rem;
          color: #71717A;
          text-align: center;
          max-width: 500px;
          margin: 0 auto 3rem;
          line-height: 1.6;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1px;
          background: #18181B;
          border: 1px solid #18181B;
          border-radius: 12px;
          overflow: hidden;
        }

        .feature-card {
          background: #09090B;
          padding: 1.75rem;
          transition: background 0.15s ease;
        }

        .feature-card:hover {
          background: #0D0D10;
        }

        .feature-icon {
          width: 40px;
          height: 40px;
          background: #18181B;
          border: 1px solid #27272A;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          color: #A1A1AA;
        }

        .feature-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #FAFAFA;
          margin-bottom: 0.5rem;
        }

        .feature-desc {
          font-size: 0.8125rem;
          color: #71717A;
          line-height: 1.6;
        }

        .stats-section {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 2rem 5rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1px;
          background: #18181B;
          border: 1px solid #18181B;
          border-radius: 12px;
          overflow: hidden;
        }

        .stat-card {
          background: #09090B;
          padding: 2rem 1.75rem;
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #FAFAFA;
          letter-spacing: -0.04em;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.8125rem;
          color: #71717A;
        }

        .cta-section {
          max-width: 600px;
          margin: 0 auto;
          padding: 5rem 2rem;
          text-align: center;
        }

        .cta-title {
          font-size: clamp(1.5rem, 3vw, 2.25rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #FAFAFA;
          margin-bottom: 1rem;
        }

        .cta-desc {
          font-size: 0.9375rem;
          color: #71717A;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .footer {
          border-top: 1px solid #18181B;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-copy {
          font-size: 0.8125rem;
          color: #52525B;
        }

        .footer-links {
          display: flex;
          gap: 1.5rem;
        }

        .footer-link {
          font-size: 0.8125rem;
          color: #52525B;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .footer-link:hover {
          color: #A1A1AA;
        }

        @media (max-width: 640px) {
          .landing-nav { padding: 1rem; }
          .hero { padding: 4rem 1.25rem 3rem; }
          .features-section { padding: 3rem 1.25rem; }
          .footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="landing-nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="nav-logo-name">RAD-UniQA</span>
        </Link>
        <div className="nav-actions">
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/login" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">
          <div className="hero-badge-dot" />
          Now with real-time streaming answers
        </div>
        <h1 className="hero-title">
          Your AI Exam<br />
          <span>Intelligence Console</span>
        </h1>
        <p className="hero-desc">
          Upload your university syllabus. Ask any exam question. Get structured, LaTeX-formatted, mark-weighted answers in seconds — powered by RAG.
        </p>
        <div className="hero-ctas">
          <Link to="/login" className="btn-hero-primary">
            Start for free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link to="/login" className="btn-hero-ghost">
            Sign in
          </Link>
        </div>
      </div>

      <div className="section-divider" />

      {/* Stats */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 2rem 3rem' }}>
        <div className="stats-section" style={{ padding: 0, margin: 0 }}>
          {[
            { value: '< 1s', label: 'Time to first token' },
            { value: '3072', label: 'Embedding dimensions' },
            { value: '10+', label: 'Mark-weighted templates' },
            { value: '100%', label: 'Syllabus-grounded answers' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="features-section">
        <div className="section-label">Features</div>
        <h2 className="section-title">Everything you need for exam prep</h2>
        <p className="section-desc">
          Built for university students. From answer generation to mock exams — all in one console.
        </p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="section-divider" />
      <div className="cta-section">
        <h2 className="cta-title">Ready to ace your exams?</h2>
        <p className="cta-desc">
          Upload your syllabus, start asking questions, and generate exam-ready answers instantly.
          Free to get started.
        </p>
        <Link to="/login" className="btn-hero-primary" style={{ display: 'inline-flex' }}>
          Open Intelligence Console
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Footer */}
      <footer className="footer">
        <span className="footer-copy">© 2026 RAD-UniQA · Built with Gemini + Qdrant RAG</span>
        <div className="footer-links">
          <Link to="/login" className="footer-link">Sign In</Link>
          <Link to="/login" className="footer-link">Get Started</Link>
        </div>
      </footer>
    </div>
  );
}
