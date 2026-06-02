import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('hiregraph_user') || '{}');
  const firstName = storedUser.name ? storedUser.name.split(' ')[0] : 'Engineer';

  useEffect(() => {
    if (!storedUser.name) {
      navigate('/login');
    }
  }, [navigate, storedUser.name]);

  useEffect(() => {
    if (!storedUser.name) return;
    axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/ai/warmup`, {}, { timeout: 30000 }).catch(() => {});
  }, [storedUser.name]);

  return (
    <div className="min-h-screen bg-[#050505] font-sans flex flex-col relative overflow-hidden">
      <div className="relative z-10 flex-1 flex flex-col w-full">
        <div className="border-b border-[#3a2b14] px-6 md:px-8 py-5 flex justify-between items-center max-w-6xl mx-auto w-full bg-[#050505]/80 backdrop-blur-sm">
          <h1 className="text-xl font-medium text-[#fff7e3] tracking-tight">HireGraph</h1>
          <button
            onClick={() => {
              localStorage.removeItem('hiregraph_user');
              navigate('/login');
            }}
            className="text-sm text-[#c8b994] hover:text-[#fff7e3] transition-colors"
          >
            Log Out
          </button>
        </div>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-6xl">
            <div className="text-center mb-12 z-10 relative">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#fff7e3] mb-5">
                Welcome back, <span className="text-[#f0b23d]">{firstName}</span>
              </h1>
              <p className="text-[#f2e6c8] text-base md:text-xl max-w-3xl mx-auto leading-relaxed font-medium shadow-sm">
                Practice technical interviews with AI-powered feedback. Pick a domain, select your
                topic, and elevate your engineering skills.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => navigate('/past-interviews')}
              className="bg-[#11100c] p-8 rounded-xl border border-[#3a2b14] hover:border-[#f0b23d]/50 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-medium text-[#f2e6c8] group-hover:text-[#fff7e3] transition-colors">Past Interviews</h3>
                <span className="text-[#f0b23d] group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
              <p className="text-[#c0ad83] text-sm leading-relaxed font-light">Review your previous sessions, analyze your scores, and study the AI's complex technical feedback.</p>
            </div>

            <div
              onClick={() => navigate('/setup')}
              className="bg-[#11100c] p-8 rounded-xl border border-[#3a2b14] hover:border-[#f0b23d]/50 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-medium text-[#f2e6c8] group-hover:text-[#fff7e3] transition-colors">Start New Session</h3>
                <span className="text-[#f0b23d] group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
              <p className="text-[#c0ad83] text-sm leading-relaxed font-light">Choose an engineering domain and specific technical topic to launch a fresh, interactive interview environment.</p>
            </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
