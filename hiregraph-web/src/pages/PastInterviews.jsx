import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Constellation from '../components/Constellation';

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

        const response = await axios.get(`http://localhost:5002/api/sessions/${user.id}`);
        
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
    <div className="min-h-screen bg-[#0d1117] font-sans flex flex-col relative overflow-hidden">
      <Constellation />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="border-b border-[#30363d] px-8 py-5 flex justify-between items-center max-w-5xl mx-auto w-full bg-[#0d1117]/80 backdrop-blur-sm">
          <div className="flex items-center gap-6">
             <button onClick={() => navigate('/dashboard')} className="text-sm text-[#9BA3AF] hover:text-[#E6EDF3] transition-colors">
              ← Back to Dashboard
            </button>
            <h1 className="text-xl font-medium text-[#E6EDF3] tracking-tight">HireGraph</h1>
          </div>
        </div>

        <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-8">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold mb-3 bg-gradient-to-r from-[#E6EDF3] to-[#C9D6FF] bg-clip-text text-transparent">
              Past Sessions
            </h2>
            <p className="text-[#8B949E] text-sm font-light">Review your archival interview data and AI evaluations.</p>
          </div>

          {loading ? (
            <div className="text-[#8B949E] animate-pulse text-sm">Accessing archives...</div>
          ) : sessions.length === 0 ? (
            <div className="bg-[#161b22] p-8 rounded-xl border border-[#30363d] text-center">
              <div className="text-[#8B949E] mb-6 text-sm">No past sessions found in the archive.</div>
              <button 
                onClick={() => navigate('/setup')}
                className="bg-[#21262d] text-[#D1D5DB] border border-[#30363d] px-6 py-2 rounded-md hover:border-[#6366F1] hover:text-[#E6EDF3] transition-colors text-sm"
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
                  className={`bg-[#161b22] p-6 rounded-xl border transition-all duration-200 group ${
                    session.status === 'completed' 
                      ? 'border-[#30363d] hover:border-[#6366F1]/50 cursor-pointer' 
                      : 'border-[#30363d] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className={`text-lg font-medium mb-1 ${session.status === 'completed' ? 'text-[#D1D5DB] group-hover:text-[#E6EDF3] transition-colors' : 'text-[#8B949E]'}`}>
                        {session.topic}
                      </h3>
                      <div className="text-xs text-[#8B949E]">
                        {session.start_time ? new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                      </div>
                    </div>
                    {session.status === 'completed' && (
                      <span className="text-[#6366F1] group-hover:translate-x-1 transition-transform duration-200">→</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-mono text-[#8B949E]">ID: {session.id ? session.id.toString().substring(0,8) : 'N/A'}</div>
                    <div className="font-medium">
                      {session.status === 'completed' ? (
                        <span className={`px-2 py-1 rounded text-xs border ${
                          session.final_score >= 80 ? 'bg-[#2ea043]/10 text-[#3fb950] border-[#2ea043]/30' : 
                          session.final_score >= 50 ? 'bg-[#d29922]/10 text-[#d29922] border-[#d29922]/30' : 
                          'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30'
                        }`}>
                          Score: {session.final_score || 0}/100
                        </span>
                      ) : (
                        <span className="bg-[#21262d] text-[#8B949E] border border-[#30363d] px-2 py-1 rounded text-xs">
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