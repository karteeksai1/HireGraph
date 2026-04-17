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
    <div className="min-h-screen bg-[#070b14] text-white font-sans flex flex-col relative overflow-hidden">
      <Constellation />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="border-b border-white/10 px-8 py-5 flex justify-between items-center max-w-5xl mx-auto w-full backdrop-blur-sm">
          <div className="flex items-center gap-6">
             <button onClick={() => navigate('/dashboard')} className="text-sm text-blue-200/50 hover:text-white transition-colors">
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-blue-400 tracking-tight">HireGraph AI</h1>
          </div>
        </div>

        <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-8">
          <div className="mb-12">
            <h2 className="text-4xl font-extrabold mb-3 text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm">
              Past Sessions
            </h2>
            <p className="text-indigo-200/60 text-lg">Review your archival interview data and AI evaluations.</p>
          </div>

          {loading ? (
            <div className="text-indigo-300 animate-pulse text-lg">Accessing archives...</div>
          ) : sessions.length === 0 ? (
            <div className="bg-[#1e293b]/60 backdrop-blur-md p-8 rounded-2xl border border-blue-900/30 text-center shadow-lg">
              <div className="text-indigo-200/60 mb-6 text-lg">No past sessions found in the archive.</div>
              <button 
                onClick={() => navigate('/setup')}
                className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-8 py-3 rounded-lg hover:bg-blue-600/40 transition-colors font-bold"
              >
                Initiate New Sequence
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => session.status === 'completed' && navigate(`/scorecard/${session.id}`)}
                  className={`bg-[#1e293b]/60 backdrop-blur-md p-6 rounded-2xl border transition-all duration-300 group ${
                    session.status === 'completed' 
                      ? 'border-blue-900/50 hover:border-blue-500/50 cursor-pointer hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:-translate-y-1' 
                      : 'border-yellow-900/30 opacity-70 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className={`text-xl font-bold mb-1 ${session.status === 'completed' ? 'text-blue-100 group-hover:text-blue-400 transition-colors' : 'text-gray-300'}`}>
                        {session.topic}
                      </h3>
                      <div className="text-xs text-indigo-200/50 uppercase tracking-wider">
                        {session.start_time ? new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                      </div>
                    </div>
                    {session.status === 'completed' && (
                      <span className="text-indigo-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300">→</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="text-xs font-mono text-gray-500">ID: {session.id ? session.id.toString().substring(0,8) : 'N/A'}</div>
                    <div className="font-bold">
                      {session.status === 'completed' ? (
                        <span className={`px-3 py-1 rounded-md text-sm border ${
                          session.final_score >= 80 ? 'bg-green-900/30 text-green-400 border-green-800/50' : 
                          session.final_score >= 50 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' : 
                          'bg-red-900/30 text-red-400 border-red-800/50'
                        }`}>
                          Score: {session.final_score || 0}/100
                        </span>
                      ) : (
                        <span className="bg-yellow-900/20 text-yellow-500 border border-yellow-700/30 px-3 py-1 rounded-md text-sm">
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