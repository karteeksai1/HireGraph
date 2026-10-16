import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { wakeAI } from '../wakeAI';

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002';

  useEffect(() => {
    const user = localStorage.getItem('hiregraph_user');
    if (user) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const postWithRetry = async (url, payload, attempts = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await axios.post(url, payload, { timeout: 45000 });
      } catch (err) {
        lastError = err;
        if (attempt < attempts) {
          setAuthStatus(`Backend waking up. Retrying ${attempt + 1}/${attempts}...`);
          await wait(1800 * attempt);
        }
      }
    }
    throw lastError;
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');
    setAuthStatus(isSignUp ? 'Creating account...' : 'Authenticating...');
    try {
      const endpoint = isSignUp ? '/api/signup' : '/api/login';
      const response = await postWithRetry(`${backendUrl}${endpoint}`, formData);
      localStorage.setItem('hiregraph_user', JSON.stringify(response.data));
      wakeAI(true);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
      setAuthStatus('');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsAuthenticating(true);
    setError('');
    setAuthStatus('Verifying Google token...');
    try {
      if (!credentialResponse.credential) throw new Error('No credential returned.');
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decodedToken = JSON.parse(window.atob(base64));
      const response = await postWithRetry(`${backendUrl}/api/auth/google`, {
        email: decodedToken.email,
        name: decodedToken.name
      });
      localStorage.setItem('hiregraph_user', JSON.stringify(response.data));
      wakeAI(true);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Google authentication failed.');
    } finally {
      setIsAuthenticating(false);
      setAuthStatus('');
    }
  };

  return (
    <div className="page-shell" style={{ flexDirection: 'row', minHeight: '100vh' }}>
      {/* Left column — identity */}
      <div
        style={{
          width: '45%',
          background: 'var(--ink)',
          color: 'var(--paper)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3rem',
          borderRight: '1px solid var(--rule)',
        }}
        className="hidden md:flex"
      >
        <div>
          {/* Logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4rem' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="18" height="18" stroke="var(--paper)" strokeWidth="1.5"/>
              <path d="M5 10 L10 5 L15 10 L10 15 Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
            </svg>
            <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>
              HireGraph
            </span>
          </div>

          <div className="t-display" style={{ color: 'var(--paper)', marginBottom: '1.5rem', maxWidth: '420px' }}>
            Technical<br />Interview<br />Infrastructure.
          </div>
          <p className="t-body" style={{ color: '#a09080', maxWidth: '360px', lineHeight: 1.7 }}>
            Practice DSA, System Design, Frontend Engineering, and SQL with AI-driven evaluation and per-question scoring.
          </p>
        </div>

        <div style={{ borderTop: '1px solid #3a3a3a', paddingTop: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {['DSA', 'System Design', 'Frontend', 'SQL'].map(d => (
              <div key={d}>
                <div style={{ width: '20px', height: '1px', background: 'var(--accent)', marginBottom: '0.5rem' }} />
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: '#a09080', letterSpacing: '0.05em' }}>
                  {d}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column — auth form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '3rem',
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="t-subheading" style={{ marginBottom: '0.75rem' }}>
            {isSignUp ? '01 / Create Account' : '01 / Sign In'}
          </div>
          <h1 className="t-heading" style={{ marginBottom: '0.5rem' }}>
            {isSignUp ? 'Register' : 'Welcome back'}
          </h1>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.8125rem', color: 'var(--muted)' }}>
            {isSignUp
              ? 'Create an account to start practicing.'
              : 'Sign in to continue your progress.'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        {authStatus && (
          <div className="alert alert-info blinking" style={{ marginBottom: '1rem' }}>
            {authStatus}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isSignUp && (
            <div className="field">
              <label className="field-label">Full Name</label>
              <input
                className="field-input"
                type="text"
                name="name"
                placeholder="Ada Lovelace"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
          )}
          <div className="field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isAuthenticating}
            className="btn btn-primary btn-lg"
            style={{ marginTop: '0.5rem', width: '100%' }}
          >
            {isAuthenticating
              ? '...'
              : isSignUp
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        <div className="hr-label">
          <span>or continue with</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Login Failed')}
            theme="outline"
            size="large"
            width="320"
            text={isSignUp ? 'signup_with' : 'signin_with'}
          />
        </div>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--rule)',
          fontFamily: 'IBM Plex Mono',
          fontSize: '0.75rem',
          color: 'var(--muted)',
          textAlign: 'center',
        }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setFormData({ name: '', email: '', password: '' });
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'IBM Plex Mono',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--ink)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              padding: 0,
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
