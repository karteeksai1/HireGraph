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
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const startInterview = async () => {
    if (!domain || !difficulty || !userId) return;
    setIsStarting(true);
    
    try {
      const response = await axios.post('http://localhost:5002/api/interview/start', {
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
          candidateName
        }
      });
    } catch (error) {
      console.error("Failed to start interview");
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030000] text-white font-sans flex flex-col relative overflow-hidden">
      <div className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[150%] h-[80%] bg-red-950/80 blur-[120px] rounded-[100%] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500/80 to-transparent pointer-events-none shadow-[0_0_20px_rgba(249,115,22,1)] z-0"></div>

      <Constellation />
      
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full p-8">
        <header className="flex justify-between items-center mb-12 border-b border-red-900/30 pb-6">
          <button onClick={() => navigate('/dashboard')} className="text-[10px] tracking-[0.3em] text-red-200/50 hover:text-white transition-colors uppercase">
            ← Abort
          </button>
          <h1 className="text-xs font-light tracking-[0.4em] text-red-200/80 uppercase">HireGraph</h1>
        </header>

        <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-3xl md:text-4xl font-light mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-white to-orange-200 tracking-[0.2em] uppercase">
              Set Up Your Interview 
            </h2>
            <p className="text-red-200/50 text-xs tracking-[0.2em] uppercase italic">Choose what you want to practice.</p>
          </div>

          <div className="space-y-8 bg-black/40 backdrop-blur-xl p-10 rounded-sm border border-red-900/20 shadow-2xl">
            <div>
              <h3 className="text-xs font-light mb-6 flex items-center gap-3 text-red-300 uppercase tracking-[0.3em]">
                <span className="flex items-center justify-center w-6 h-6 border border-red-500/30 text-red-400 text-[10px]">1</span> 
                Domain Vector
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(domains).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setDomain(key)}
                    className={`p-6 border text-center transition-all duration-500 ${
                      domain === key 
                        ? 'border-orange-500/60 bg-red-900/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]' 
                        : 'border-red-900/30 bg-black/40 hover:border-red-500/50'
                    }`}
                  >
                    <div className={`font-light text-sm tracking-[0.1em] uppercase ${domain === key ? 'text-white' : 'text-red-200/60'}`}>{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={`transition-all duration-700 ${domain ? 'opacity-100 translate-y-0' : 'opacity-20 pointer-events-none translate-y-4'}`}>
              <h3 className="text-xs font-light mb-6 flex items-center gap-3 text-orange-300 uppercase tracking-[0.3em]">
                <span className="flex items-center justify-center w-6 h-6 border border-orange-500/30 text-orange-400 text-[10px]">2</span> 
                Difficulty Level
              </h3>
              <div className="flex flex-wrap gap-4">
                {difficulties.map(diff => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-4 border text-xs tracking-[0.15em] uppercase transition-all duration-500 ${
                      difficulty === diff
                        ? 'border-orange-400 bg-orange-900/20 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                        : 'border-red-900/30 bg-black/40 text-red-200/50 hover:border-red-500/50 hover:text-red-100'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 text-center pb-12">
            <button
              onClick={startInterview}
              disabled={!domain || !difficulty || isStarting}
              className={`w-full max-w-md mx-auto py-5 border font-light text-sm uppercase tracking-[0.3em] transition-all duration-700 ${
                !domain || !difficulty
                  ? 'bg-black/50 text-red-900/50 cursor-not-allowed border-red-950' 
                  : 'bg-red-950/40 border-orange-500/50 hover:bg-red-900/60 hover:border-orange-400 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)]'
              }`}
            >
              {isStarting ? 'Initiating...' : 'START INTERVIEW'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}