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

  return (
    <div className="min-h-screen text-white font-sans flex flex-col relative overflow-hidden">
      <Constellation />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="border-b border-white/10 px-8 py-5 flex justify-between items-center max-w-5xl mx-auto w-full backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-blue-400 tracking-tight">HireGraph AI</h1>
          <button
            onClick={() => {
              localStorage.removeItem('hiregraph_user');
              navigate('/login');
            }}
            className="text-sm text-blue-200/50 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-8 pt-24 pb-16 flex flex-col items-center text-center">
          <p className="text-indigo-300 text-lg mb-2 font-medium tracking-wide">Welcome back,</p>
          <h2 className="text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm">
            {userName}
          </h2>
          <p className="text-indigo-200/70 text-lg mb-16 max-w-2xl leading-relaxed font-light tracking-wide">
            Run mock technical interviews with AI. Choose your domain, write code in real time, and get detailed feedback on your solutions and design choices.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-8 w-full pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div
              onClick={() => navigate('/past-interviews')}
              className="bg-[#1e293b]/60 backdrop-blur-md p-8 rounded-2xl border border-blue-900/30 hover:border-blue-500/50 cursor-pointer transition-all duration-300 group hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-100 group-hover:text-blue-400 transition-colors">Past Interviews</h3>
                <span className="text-indigo-500 group-hover:text-blue-400 group-hover:translate-x-2 transition-all duration-300">→</span>
              </div>
              <p className="text-indigo-200/60 text-sm leading-relaxed">Review your previous sessions, analyze your scores, and study the AI's complex technical feedback.</p>
            </div>

            <div
              onClick={() => navigate('/setup')}
              className="bg-[#1e293b]/60 backdrop-blur-md p-8 rounded-2xl border border-purple-900/30 hover:border-purple-500/50 cursor-pointer transition-all duration-300 group hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-100 group-hover:text-purple-400 transition-colors">Start New Session</h3>
                <span className="text-indigo-500 group-hover:text-purple-400 group-hover:translate-x-2 transition-all duration-300">→</span>
              </div>
              <p className="text-indigo-200/60 text-sm leading-relaxed">Choose an engineering domain and specific technical topic to launch a fresh, interactive interview environment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}