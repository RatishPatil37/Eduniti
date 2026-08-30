import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // If already logged in, redirect to app
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app', { replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/app', { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Reset spinners if user navigates back (via browser back button / Back-Forward Cache)
  useEffect(() => {
    const handleRestore = () => {
      setGoogleLoading(false);
      setGithubLoading(false);
      setLoading(false);
    };

    window.addEventListener('pageshow', handleRestore);
    window.addEventListener('focus', handleRestore);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleRestore();
      }
    });

    return () => {
      window.removeEventListener('pageshow', handleRestore);
      window.removeEventListener('focus', handleRestore);
    };
  }, []);

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${SITE_URL}/app`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleGithubAuth = async () => {
    setGithubLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${SITE_URL}/app`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'GitHub sign-in failed. Please try again.');
      setGithubLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Auth state change will redirect
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${SITE_URL}/app` }
        });
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm your account, then log in.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isOAuthLoading = googleLoading || githubLoading;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        .auth-card {
          width: 100%;
          max-width: 410px;
          background: #18181B;
          border: 1px solid #27272A;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        }

        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1.75rem;
        }

        .auth-logo-icon {
          width: 36px;
          height: 36px;
          background: #FAFAFA;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-logo-text {
          font-size: 1.125rem;
          font-weight: 700;
          color: #FAFAFA;
          letter-spacing: -0.02em;
        }

        .auth-logo-sub {
          font-size: 0.7rem;
          color: #71717A;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .auth-tabs {
          display: flex;
          background: #09090B;
          border-radius: 8px;
          padding: 4px;
          margin-bottom: 1.5rem;
          border: 1px solid #27272A;
        }

        .auth-tab {
          flex: 1;
          padding: 0.5rem;
          border: none;
          background: transparent;
          color: #71717A;
          font-size: 0.8125rem;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }

        .auth-tab.active {
          background: #27272A;
          color: #FAFAFA;
        }

        .auth-tab:hover:not(.active) {
          color: #A1A1AA;
        }

        .oauth-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 1.25rem;
        }

        .oauth-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0.625rem 1rem;
          background: #18181B;
          color: #FAFAFA;
          border: 1px solid #3F3F46;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .oauth-btn:hover:not(:disabled) {
          background: #27272A;
          border-color: #52525B;
        }

        .oauth-btn-google {
          background: #FAFAFA;
          color: #09090B;
          border: none;
          font-weight: 600;
        }

        .oauth-btn-google:hover:not(:disabled) {
          background: #E4E4E7;
        }

        .oauth-btn-github {
          background: #18181B;
          color: #FAFAFA;
          border: 1px solid #3F3F46;
          font-weight: 500;
        }

        .oauth-btn-github:hover:not(:disabled) {
          background: #27272A;
          border-color: #71717A;
        }

        .oauth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1.25rem;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #27272A;
        }

        .divider-text {
          font-size: 0.75rem;
          color: #52525B;
          font-weight: 500;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #A1A1AA;
          margin-bottom: 0.375rem;
        }

        .form-input {
          width: 100%;
          padding: 0.5625rem 0.75rem;
          background: #09090B;
          border: 1px solid #3F3F46;
          border-radius: 8px;
          color: #FAFAFA;
          font-size: 0.875rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .form-input:focus {
          border-color: #71717A;
        }

        .form-input::placeholder {
          color: #52525B;
        }

        .submit-btn {
          width: 100%;
          padding: 0.625rem 1rem;
          background: #FAFAFA;
          color: #09090B;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-top: 0.25rem;
        }

        .submit-btn:hover:not(:disabled) {
          background: #E4E4E7;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-box {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 0.625rem 0.75rem;
          color: #FCA5A5;
          font-size: 0.8125rem;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .success-box {
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 8px;
          padding: 0.625rem 0.75rem;
          color: #86EFAC;
          font-size: 0.8125rem;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .back-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 1.25rem;
          color: #52525B;
          font-size: 0.8125rem;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .back-link:hover {
          color: #A1A1AA;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="auth-logo-text">RAD-UniQA</div>
            <div className="auth-logo-sub">Intelligence Console</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
            Sign In
          </button>
          <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>
            Create Account
          </button>
        </div>

        {/* OAuth Buttons Stack */}
        <div className="oauth-stack">
          {/* Google OAuth */}
          <button className="oauth-btn oauth-btn-google" onClick={handleGoogleAuth} disabled={isOAuthLoading || loading}>
            {googleLoading ? (
              <span className="spinner" style={{ borderTopColor: '#09090B' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
          </button>

          {/* GitHub OAuth */}
          <button className="oauth-btn oauth-btn-github" onClick={handleGithubAuth} disabled={isOAuthLoading || loading}>
            {githubLoading ? (
              <span className="spinner" style={{ borderTopColor: '#FAFAFA' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FAFAFA">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            )}
            <span>{githubLoading ? 'Connecting GitHub...' : 'Continue with GitHub'}</span>
          </button>
        </div>

        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">or continue with email</span>
          <div className="divider-line" />
        </div>

        {/* Error / Success messages */}
        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        {/* Email/Password form */}
        <form onSubmit={handleEmailAuth}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>
          <button type="submit" className="submit-btn" disabled={loading || isOAuthLoading}>
            {loading ? <span className="spinner" style={{ borderTopColor: '#09090B' }} /> : (mode === 'login' ? 'Sign In with Email' : 'Create Account')}
          </button>
        </form>

        <Link to="/" className="back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </div>
    </div>
  );
}
