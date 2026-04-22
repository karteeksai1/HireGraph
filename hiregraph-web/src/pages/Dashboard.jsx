import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Constellation from '../components/Constellation';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hiregraph_user'));
    if (user && user.name) {
      setUserName(user.name);
    } else {
      navigate('/login');
    }
  }, [navigate]);
const storedUser = JSON.parse(localStorage.getItem('hiregraph_user') || '{}');
const firstName = storedUser.name ? storedUser.name.split(' ')[0] : 'Engineer';
  return (
    <div className="min-h-screen bg-[#0d1117] font-sans flex flex-col relative overflow-hidden">
      <Constellation />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="border-b border-[#30363d] px-8 py-5 flex justify-between items-center max-w-5xl mx-auto w-full bg-[#0d1117]/80 backdrop-blur-sm">
          <h1 className="text-xl font-medium text-[#E6EDF3] tracking-tight">HireGraph</h1>
          <button
            onClick={() => {
              localStorage.removeItem('hiregraph_user');
              navigate('/login');
            }}
            className="text-sm text-[#9BA3AF] hover:text-[#E6EDF3] transition-colors"
          >
            Log Out
          </button>
        </div>

        <div className="text-center mb-16 z-10 relative">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            Welcome back, <span className="text-blue-500">{firstName}</span>
          </h1>
          <p className="text-gray-200 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium shadow-sm">
            Practice technical interviews with AI-powered feedback. Pick a domain, select your
            topic, and elevate your engineering skills.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-8 w-full pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => navigate('/past-interviews')}
              className="bg-[#161b22] p-8 rounded-xl border border-[#30363d] hover:border-[#6366F1]/50 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-medium text-[#D1D5DB] group-hover:text-[#E6EDF3] transition-colors">Past Interviews</h3>
                <span className="text-[#6366F1] group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
              <p className="text-[#94A3B8] text-sm leading-relaxed font-light">Review your previous sessions, analyze your scores, and study the AI's complex technical feedback.</p>
            </div>

            <div
              onClick={() => navigate('/setup')}
              className="bg-[#161b22] p-8 rounded-xl border border-[#30363d] hover:border-[#6366F1]/50 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-medium text-[#D1D5DB] group-hover:text-[#E6EDF3] transition-colors">Start New Session</h3>
                <span className="text-[#6366F1] group-hover:translate-x-1 transition-transform duration-200">→</span>
              </div>
              <p className="text-[#94A3B8] text-sm leading-relaxed font-light">Choose an engineering domain and specific technical topic to launch a fresh, interactive interview environment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}