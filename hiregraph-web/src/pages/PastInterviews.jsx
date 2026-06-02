import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PastInterviews() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const userStr = localStorage.getItem('hiregraph_user');
        if (!userStr) {
          navigate('/login');
          return;
        }
        
        const user = JSON.parse(userStr);
        if (!user || !user.id) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/sessions/${user.id}`);
        
        if (Array.isArray(response.data)) {
          setSessions(response.data);
        } else {
          setSessions([]);
        }
      } catch (error) {
        console.error("Failed to load past sessions:", error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#050505] font-sans flex flex-col relative overflow-hidden">
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="border-b border-[#3a2b14] px-8 py-5 flex justify-between items-center max-w-5xl mx-auto w-full bg-[#050505]/80 backdrop-blur-sm">
          <div className="flex items-center gap-6">
             <button onClick={() => navigate('/dashboard')} className="text-sm text-[#c8b994] hover:text-[#fff7e3] transition-colors">
              ← Back to Dashboard
            </button>
            <h1 className="text-xl font-medium text-[#fff7e3] tracking-tight">HireGraph</h1>
          </div>
        </div>

        <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-8">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold mb-3 bg-linear-to-r from-[#fff7e3] to-[#f7c96b] bg-clip-text text-transparent">
              Past Sessions
            </h2>
            <p className="text-[#b9aa8d] text-sm font-light">Review your archival interview data and AI evaluations.</p>
          </div>

          {loading ? (
            <div className="text-[#b9aa8d] animate-pulse text-sm">Accessing archives...</div>
          ) : sessions.length === 0 ? (
            <div className="bg-[#11100c] p-8 rounded-xl border border-[#3a2b14] text-center">
              <div className="text-[#b9aa8d] mb-6 text-sm">No past sessions found in the archive.</div>
              <button 
                onClick={() => navigate('/setup')}
                className="bg-[#1a1710] text-[#f2e6c8] border border-[#3a2b14] px-6 py-2 rounded-md hover:border-[#f0b23d] hover:text-[#fff7e3] transition-colors text-sm"
              >
                Start New Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => session.status === 'completed' && navigate(`/scorecard/${session.id}`)}
                  className={`bg-[#11100c] p-6 rounded-xl border transition-all duration-200 group ${
                    session.status === 'completed' 
                      ? 'border-[#3a2b14] hover:border-[#f0b23d]/50 cursor-pointer' 
                      : 'border-[#3a2b14] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className={`text-lg font-medium mb-1 ${session.status === 'completed' ? 'text-[#f2e6c8] group-hover:text-[#fff7e3] transition-colors' : 'text-[#b9aa8d]'}`}>
                        {session.topic}
                      </h3>
                      <div className="text-xs text-[#b9aa8d]">
                        {session.start_time ? new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                      </div>
                    </div>
                    {session.status === 'completed' && (
                      <span className="text-[#f0b23d] group-hover:translate-x-1 transition-transform duration-200">→</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-mono text-[#b9aa8d]">ID: {session.id ? session.id.toString().substring(0,8) : 'N/A'}</div>
                    <div className="font-medium text-right">
                      {session.status === 'completed' ? (
                        <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded text-xs border ${
                          session.final_score >= 80 ? 'bg-[#f0b23d]/10 text-[#f0b23d] border-[#f0b23d]/30' : 
                          session.final_score >= 50 ? 'bg-[#f0b23d]/10 text-[#f0b23d] border-[#f0b23d]/30' : 
                          'bg-[#f0b23d]/10 text-[#f0b23d] border-[#f0b23d]/30'
                        }`}>
                          Avg: {session.avg_score || session.final_score || 0}/100
                        </span>
                        <span className="text-[11px] text-[#b9aa8d] font-mono">
                          {session.questions_answered || 0} question{Number(session.questions_answered) === 1 ? '' : 's'}
                        </span>
                        </div>
                      ) : (
                        <span className="bg-[#1a1710] text-[#b9aa8d] border border-[#3a2b14] px-2 py-1 rounded text-xs">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
