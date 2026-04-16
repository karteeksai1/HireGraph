import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Constellation from '../components/Constellation';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [candidateName, setCandidateName] = useState('Candidate');
  const [userId, setUserId] = useState(null);
  const [domain, setDomain] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('python');
  const [isStarting, setIsStarting] = useState(false);

  const domainTopics = {
    'dsa': { label: 'Data Structures & Algo', topics: ['Linked Lists', 'Arrays'] },
    'system-design': { label: 'System Design', topics: ['Rate Limiting', 'Microservices'] },
    'frontend': { label: 'Frontend Engineering', topics: ['React Hooks', 'State Management'] },
    'sql': { label: 'Database & SQL', topics: ['Window Functions', 'Query Optimization'] }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hiregraph_user'));
    if (user && user.name) {
      setCandidateName(user.name);
      setUserId(user.id);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleDomainSelect = (selectedDomain) => {
    setDomain(selectedDomain);
    setTopic('');
  };

  const startInterview = async () => {
    if (!domain || !topic || !language || !userId) return;
    setIsStarting(true);
    
    try {
      const response = await axios.post('http://localhost:5001/api/interview/start', {
        userId,
        candidateName,
        topic,
        domain
      });
      
      navigate('/interview', {
        state: {
          sessionId: response.data.sessionId,
          question: response.data.question,
          domain,
          topic,
          language,
          candidateName
        }
      });
    } catch (error) {
      console.error("Failed to start interview");
      setIsStarting(false);
    }
  };

  return (
    <div className=" <Constellation />min-h-screen bg-[#0f172a] text-white font-sans flex flex-col relative overflow-hidden">
      <Constellation/>
      <div className="absolute inset-0 bg-linear-to-b from-indigo-900/20 via-[#0f172a] to-[#0f172a] z-0"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50 z-0"></div>
      
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full p-8">
        <header className="flex justify-between items-center mb-16 border-b border-gray-800/50 pb-6">
          <div className="flex items-center gap-6">
             <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition-colors">
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-blue-400 tracking-tight">HireGraph AI</h1>
          </div>
          
          <div className="flex items-center gap-3 bg-[#1e293b]/80 backdrop-blur-md p-2 rounded-lg border border-gray-700/50 shadow-lg">
            <span className="text-sm text-gray-400 font-medium px-2 uppercase tracking-wider">Language</span>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-800 text-white border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-blue-500 font-mono text-sm cursor-pointer hover:bg-gray-700 transition-colors"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>
        </header>

        <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-extrabold mb-4 text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm">
              Configure Your Interview
            </h2>
            <p className="text-gray-400 text-lg">Select your engineering domain and specific topic to generate a tailored technical challenge.</p>
          </div>

          <div className="space-y-8 bg-[#1e293b]/60 backdrop-blur-xl p-8 rounded-2xl border border-gray-700/50 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-gray-200">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-sm border border-blue-500/30">1</span> 
                Select Domain
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(domainTopics).map(([key, data]) => (
                  <button
                    key={key}
                    onClick={() => handleDomainSelect(key)}
                    className={`p-5 rounded-xl border text-left transition-all duration-300 ${
                      domain === key 
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] -translate-y-0.5' 
                        : 'border-gray-700 bg-gray-800/40 hover:border-gray-500 hover:bg-gray-800/80'
                    }`}
                  >
                    <div className={`font-bold text-lg ${domain === key ? 'text-blue-400' : 'text-gray-300'}`}>{data.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={`transition-all duration-500 ${domain ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none translate-y-2'}`}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-gray-200">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-sm border border-purple-500/30">2</span> 
                Select Topic
              </h3>
              <div className="flex flex-wrap gap-3">
                {domain ? (
                  domainTopics[domain].topics.map(t => (
                    <button
                      key={t}
                      onClick={() => setTopic(t)}
                      className={`px-6 py-3 rounded-full border font-medium transition-all duration-300 ${
                        topic === t
                          ? 'border-purple-500 bg-purple-500/15 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                          : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm italic px-2">Please select a domain first.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 text-center pb-12">
            <button
              onClick={startInterview}
              disabled={!domain || !topic || isStarting}
              className={`w-full max-w-md mx-auto py-4 rounded-xl font-bold text-lg transition-all duration-300 tracking-wide ${
                !domain || !topic 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                  : 'bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-[1.02] border border-indigo-400/30'
              }`}
            >
              {isStarting ? 'Generating Environment...' : 'Begin Interview Session'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}