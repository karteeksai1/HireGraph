import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Constellation from '../components/Constellation';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [candidateName, setCandidateName] = useState('Candidate');
  const [userId, setUserId] = useState(null);
  const [domain, setDomain] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const domains = {
    'dsa': 'Data Structures & Algorithms',
    'system-design': 'System Design',
    'frontend': 'Frontend Engineering',
    'sql': 'Database & SQL'
  };
  
  const difficulties = ['easy', 'medium', 'hard'];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hiregraph_user'));
    if (user && user.name) {
      setCandidateName(user.name);
      setUserId(user.id);
      axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/ai/warmup`, {}, { timeout: 30000 }).catch(() => {});
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const startInterview = async () => {
    if (!domain || !difficulty || !userId) return;
    setIsStarting(true);
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/interview/start`, {
        userId,
        candidateName,
        domain,
        difficulty
      });
      
      navigate('/interview', {
        state: {
          sessionId: response.data.sessionId,
          question: response.data.question,
          topic: response.data.topic,
          testCases: response.data.testCases,
          boilerplates: response.data.boilerplates,
          domain,
          difficulty,
          candidateName,
          aiBooting: response.data.aiBooting
        }
      });
      localStorage.setItem('hiregraph_active_interview', JSON.stringify({
        sessionId: response.data.sessionId,
        question: response.data.question,
        topic: response.data.topic,
        testCases: response.data.testCases,
        boilerplates: response.data.boilerplates,
        domain,
        difficulty,
        candidateName,
        aiBooting: response.data.aiBooting
      }));
    } catch (err) {
      console.error("Failed to start:", err);
      alert("Server is waking up or busy. Please wait 1 minute and try again.");
    } finally {
      setIsStarting(false); // 2. Unlock the button no matter what happens!
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] font-sans flex flex-col relative overflow-hidden">
      <Constellation />
      
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full px-6 py-8">
        <header className="flex justify-between items-center mb-8 border-b border-[#30363d] pb-5">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-[#9BA3AF] hover:text-[#E6EDF3] transition-colors">
            ← Back
          </button>
          <h1 className="text-sm font-medium text-[#8B949E] tracking-widest uppercase">Configuration</h1>
        </header>

        <main className="flex-1 flex flex-col justify-center w-full mx-auto">
          <div className="mb-10">
            <h2 className="text-3xl font-semibold mb-3 bg-linear-to-r from-[#E6EDF3] to-[#C9D6FF] bg-clip-text text-transparent">
              Session Parameters
            </h2>
            <p className="text-[#8B949E] text-sm font-light">Choose a local question instantly, then use AI for hints and scoring.</p>
          </div>

          <div className="space-y-8 bg-[#161b22] p-8 rounded-xl border border-[#30363d]">
            <div>
              <h3 className="text-sm font-medium mb-4 text-[#D1D5DB]">
                1. Domain Vector
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(domains).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setDomain(key)}
                    className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                      domain === key 
                        ? 'border-[#6366F1] bg-[#6366F1]/10' 
                        : 'border-[#30363d] bg-[#0d1117] hover:border-[#8B949E]'
                    }`}
                  >
                    <div className={`font-light text-sm ${domain === key ? 'text-[#E6EDF3]' : 'text-[#9BA3AF]'}`}>{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={`transition-opacity duration-300 ${domain ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <h3 className="text-sm font-medium mb-4 text-[#D1D5DB]">
                2. Difficulty Level
              </h3>
              <div className="flex gap-3">
                {difficulties.map(diff => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-3 rounded-lg border text-sm capitalize transition-all duration-200 ${
                      difficulty === diff
                        ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#E6EDF3]'
                        : 'border-[#30363d] bg-[#0d1117] text-[#9BA3AF] hover:border-[#8B949E]'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={startInterview}
              disabled={!domain || !difficulty || isStarting}
              className={`px-8 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                !domain || !difficulty
                  ? 'bg-[#21262d] text-[#8B949E] cursor-not-allowed border border-[#30363d]' 
                  : 'bg-[#6366F1] hover:bg-[#4f46e5] text-white shadow-sm'
              }`}
            >
              {isStarting ? 'Initiating...' : 'Start Session'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
