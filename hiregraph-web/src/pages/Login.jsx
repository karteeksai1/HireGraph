import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    if (user) {
      navigate('/dashboard', { replace: true });
    }
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
          setAuthStatus(`Backend is waking up. Retrying ${attempt + 1}/${attempts}...`);
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
    setAuthStatus(isSignUp ? 'Creating your account...' : 'Signing you in...');
    try {
      const endpoint = isSignUp ? '/api/signup' : '/api/login';
      const response = await postWithRetry(`${backendUrl}${endpoint}`, formData);
      
      localStorage.setItem('hiregraph_user', JSON.stringify(response.data));
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
    setAuthStatus('Signing in with Google...');
    try {
      if (!credentialResponse.credential) {
        throw new Error('Google did not return a credential.');
      }

      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decodedToken = JSON.parse(window.atob(base64));

      const response = await postWithRetry(`${backendUrl}/api/auth/google`, {
        email: decodedToken.email,
        name: decodedToken.name
      });
      
      localStorage.setItem('hiregraph_user', JSON.stringify(response.data));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error("Full Google Error:", err);
      setError(err.response?.data?.error || 'Google authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
      setAuthStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#fff7e3] p-4">
      <div className="bg-[#11100c] p-8 rounded-xl shadow-2xl border border-[#3a2b14] w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f0b23d] mb-2">HireGraph AI</h1>
          <p className="text-[#b9aa8d]">
            {isSignUp ? 'Create your account to start interviewing.' : 'Sign in to continue your progress.'}
          </p>
        </div>

        {error && <div className="bg-[#f0b23d]/10 border border-[#f0b23d]/40 text-[#f7c96b] p-3 rounded mb-4 text-sm text-center">{error}</div>}
        {authStatus && <div className="bg-[#050505] border border-[#3a2b14] text-[#f7c96b] p-3 rounded mb-4 text-sm text-center">{authStatus}</div>}

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 mb-6">
          {isSignUp && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="bg-[#050505] border border-[#3a2b14] text-[#fff7e3] p-3 rounded focus:outline-none focus:border-[#f0b23d] transition-colors"
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="bg-[#050505] border border-[#3a2b14] text-[#fff7e3] p-3 rounded focus:outline-none focus:border-[#f0b23d] transition-colors"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="bg-[#050505] border border-[#3a2b14] text-[#fff7e3] p-3 rounded focus:outline-none focus:border-[#f0b23d] transition-colors"
          />
          <button 
            type="submit"
            disabled={isAuthenticating}
            className="w-full bg-[#f0b23d] hover:bg-[#d9961f] text-[#050505] p-3 rounded font-bold transition-colors mt-2"
          >
            {isAuthenticating ? 'Working...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-[#3a2b14]"></div>
          <span className="text-[#8f805f] text-sm">OR</span>
          <div className="flex-1 border-t border-[#3a2b14]"></div>
        </div>

        <div className="w-full flex justify-center mb-6">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Login Failed')}
            theme="filled_black"
            size="large"
            width="320"
            text={isSignUp ? "signup_with" : "signin_with"}
          />
        </div>

        <div className="text-center text-[#b9aa8d] text-sm">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setFormData({ name: '', email: '', password: '' });
            }}
            className="text-[#f0b23d] hover:text-[#f7c96b] font-semibold transition-colors"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
