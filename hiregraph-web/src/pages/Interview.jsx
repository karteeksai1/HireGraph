import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const [sessionId, setSessionId] = useState(state.sessionId || null);
  const [candidateName, setCandidateName] = useState(state.candidateName || 'Candidate');
  const [domain, setDomain] = useState(state.domain || 'dsa');
  const [topic, setTopic] = useState(state.topic || 'Linked Lists');
  const [language, setLanguage] = useState(state.language || 'python');
  const [userCode, setUserCode] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!location.state) {
      navigate('/setup');
      return;
    }
    
    if (chatHistory.length === 0 && location.state.question) {
      setChatHistory([
        {
          sender: 'AI',
          message: `Welcome ${state.candidateName}. We will be focusing on ${state.topic} (${state.domain}) today. Please write your solution in ${state.language}.`
        },
        {
          sender: 'AI',
          message: `Here is your question:\n\n${state.question}`
        }
      ]);
    }
  }, [location.state, navigate, chatHistory.length, state.candidateName, state.topic, state.domain, state.language, state.question]);

  const submitCode = async () => {
    if (!sessionId) return;
    setIsEvaluating(true);
    
    setChatHistory(prev => [...prev, { 
      sender: 'USER', 
      message: `Submitted ${language} code for evaluation.`,
      submitted_code: userCode 
    }]);

    try {
      const response = await axios.post('http://localhost:5002/api/interview/submit', {
        sessionId,
        topic,
        domain,
        language,
        userCode
      });
      
      setChatHistory(prev => [...prev, { 
        sender: 'AI', 
        message: response.data.feedback,
        isPassed: response.data.isPassed,
        score: response.data.score
      }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { sender: 'AI', message: "System Error: Could not evaluate code. History integration active." }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const finishInterview = async () => {
    if (!sessionId) return;
    try {
      await axios.post('http://localhost:5002/api/interview/finish', { sessionId });
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      console.error("Full Backend Error:", error);
      alert(`Backend Error: ${errorMsg}\n\nCheck your Node.js terminal for the exact database crash!`);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans  flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-900/20 via-[#0f172a] to-[#0f172a] z-0"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50 z-0"></div>
      
      <div className="relative z-10 flex-1 flex h-full">
        <div className="w-1/3 flex flex-col border-r border-gray-800/50 bg-[#1e293b]/60 backdrop-blur-md">
          <div className="p-4 border-b border-gray-800/50">
            <div className="flex items-center gap-4 mb-3">
              <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm">
                ← Dashboard
              </button>
              <h1 className="text-xl font-bold text-blue-400">HireGraph AI</h1>
            </div>
            <div className="text-sm text-gray-400">
              Session ID: {sessionId} | {topic}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 leading-relaxed">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`p-4 rounded-xl max-w-[90%] ${msg.sender === 'AI' ? 'bg-[#111827]/80 backdrop-blur-sm self-start border border-gray-700/50' : 'bg-blue-600/90 self-end shadow-lg'}`}>
                <div className="text-xs text-indigo-300 font-medium mb-1.5 uppercase tracking-wider">{msg.sender}</div>
                <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                {msg.sender === 'USER' && msg.submitted_code && (
                    <div className="mt-3 bg-black/30 p-2 rounded-md font-mono text-[10px] text-gray-400 line-clamp-2">
                        {msg.submitted_code}
                    </div>
                )}
                {msg.isPassed !== undefined && (
                  <div className={`mt-3 p-2 rounded-md font-bold text-xs border ${msg.isPassed ? 'bg-green-950/40 text-green-400 border-green-700' : 'bg-red-950/40 text-red-400 border-red-700'}`}>
                    {msg.isPassed ? '✓ TEST PASSED' : '✕ TEST FAILED'}
                    {msg.score !== undefined && (
                        <span className="ml-2">Score: {msg.score}/100</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isEvaluating && (
              <div className="text-sm text-gray-400 animate-pulse bg-[#111827]/80 p-3 rounded-lg border border-gray-700/50">AI is analyzing your {state.language} submission...</div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="w-2/3 flex flex-col">
          <div className="flex justify-between items-center p-3 border-b border-gray-800/50 bg-[#1e293b]/60 backdrop-blur-md">
            <span className="text-sm text-indigo-300 font-mono ml-4 uppercase tracking-wider">
                solution.{state.language === 'python' ? 'py' : state.language === 'javascript' ? 'js' : state.language === 'java' ? 'java' : state.language === 'cpp' ? 'cpp' : 'sql'}
            </span>
            <div className="flex gap-4 mr-2">
              <button 
                onClick={finishInterview}
                disabled={!sessionId}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-colors border ${!sessionId ? 'hidden' : 'bg-red-950/40 text-red-300 border-red-700 hover:bg-red-900/60'}`}
              >
                Finish Interview
              </button>
            <button 
              onClick={submitCode}
              disabled={!sessionId || isEvaluating}
              className={`px-7 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 border ${!sessionId || isEvaluating ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700' : 'bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-[1.01] border-indigo-400/40'}`}
            >
              Submit Code
            </button>
            </div>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={state.language}
              theme="vs-dark"
              value={userCode}
              onChange={(value) => setUserCode(value)}
              options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}