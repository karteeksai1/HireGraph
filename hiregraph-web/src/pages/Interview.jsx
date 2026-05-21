import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const sessionId = state.sessionId || null;
  const candidateName = state.candidateName || 'Candidate';
  const domain = state.domain || 'dsa';
  const difficulty = state.difficulty || 'medium';
  const [topic, setTopic] = useState(state.topic || 'Random Question');
  const [questionText, setQuestionText] = useState(state.question || '');
  
  const [language, setLanguage] = useState('python');
  const [boilerplates, setBoilerplates] = useState(state.boilerplates || {});
  const [userCode, setUserCode] = useState('');
  
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  const [testCases, setTestCases] = useState(state.testCases || []);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [testResults, setTestResults] = useState(null);
  
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [lastScore, setLastScore] = useState(null);
  const [aiStatus, setAiStatus] = useState(state.aiBooting ? 'booting' : 'unknown');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!location.state) {
      navigate('/setup');
      return;
    }
    
    if (chatHistory.length === 0 && questionText) {
      setChatHistory([
        {
          sender: 'AI',
          message: `Welcome ${candidateName}. Phase 1 initiated. Difficulty: ${difficulty}.\n\nChallenge: ${topic}\n\n${questionText}`
        }
      ]);
    }
  }, [location.state, navigate, chatHistory.length, candidateName, topic, questionText, difficulty]);

  useEffect(() => {
    if (boilerplates && boilerplates[language]) {
        setUserCode(boilerplates[language]);
    } else {
        setUserCode('');
    }
  }, [language, boilerplates, questionNumber]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002';

    const warmupAi = async () => {
      setAiStatus('booting');
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const response = await axios.post(`${backendUrl}/api/ai/warmup`, {}, { timeout: 30000 });
          if (!cancelled && response.data.ready) {
            setAiStatus('ready');
            return;
          }
        } catch {
          // Keep the visible booting state; the next attempt may wake the service.
        }
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
      if (!cancelled) setAiStatus('slow');
    };

    warmupAi();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !sessionId) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'USER', message: userMsg }]);

    try {
      if (aiStatus !== 'ready') setAiStatus('booting');
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/interview/chat`, {
        sessionId,
        domain,
        message: userMsg,
        questionText
      });
      
      setChatHistory(prev => [...prev, { sender: 'AI', message: response.data.reply }]);
      setAiStatus('ready');
    } catch {
      setAiStatus('slow');
      setChatHistory(prev => [...prev, { sender: 'AI', message: "AI is still booting. Please wait a moment and try again." }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendChatMessage();
  };

  const runCode = async () => {
    if (!userCode.trim() || testCases.length === 0) return;
    setIsRunning(true);
    setTestResults(null);
    
    try {
      if (aiStatus !== 'ready') setAiStatus('booting');
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/interview/run`, {
        code: userCode,
        language,
        testCases
      });
      setTestResults(response.data.results);
      setAiStatus('ready');
    } catch {
      setAiStatus('slow');
      console.error("Run failed");
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    if (!sessionId || !userCode.trim()) return;
    setIsEvaluating(true);
    
    setChatHistory(prev => [...prev, { 
      sender: 'USER', 
      message: `Submitted ${language} solution for evaluation.`,
      submitted_code: userCode 
    }]);

    try {
      if (aiStatus !== 'ready') setAiStatus('booting');
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/interview/submit`, {
        sessionId,
        topic,
        domain,
        language,
        userCode,
        questionText
      });
      
      setChatHistory(prev => [...prev, { 
        sender: 'AI', 
        message: response.data.feedback,
        isPassed: response.data.isPassed,
        score: response.data.score,
        rawScore: response.data.rawScore,
        penalty: response.data.penalty
      }]);
      setLastScore(response.data.score);
      setAiStatus('ready');
    } catch (error) {
      setAiStatus('slow');
      setChatHistory(prev => [...prev, {
        sender: 'AI',
        message: error.response?.data?.error || "AI is still booting. Please wait a moment and submit again."
      }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const loadNextQuestion = async () => {
      if (!sessionId) return;
      setIsFetchingNext(true);

      try {
          const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/interview/next`, {
              sessionId,
              domain,
              difficulty,
              previousTopic: topic
          });

          setTopic(response.data.topic);
          setQuestionText(response.data.question);
          setTestCases(response.data.testCases);
          setBoilerplates(response.data.boilerplates);
          setTestResults(null);
          setActiveTestCase(0);
          setLastScore(null);
          setQuestionNumber(prev => prev + 1);
          
          setChatHistory(prev => [...prev, { 
            sender: 'AI', 
            message: `Phase ${questionNumber + 1} initiated.\n\nNew Challenge: ${response.data.topic}\n\n${response.data.question}` 
          }]);

      } catch {
          alert("Failed to load Phase 2.");
      } finally {
          setIsFetchingNext(false);
      }
  };

  const finishInterview = async () => {
    if (!sessionId) return;
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/interview/finish`, { sessionId });
      navigate(`/scorecard/${sessionId}`);
    } catch {
      alert("Failed to close session.");
    }
  };

  return (
    <div className="flex h-screen bg-[#0d1117] font-sans overflow-hidden">
      {aiStatus !== 'ready' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-[#6366F1]/40 bg-[#161b22] px-5 py-3 text-sm text-[#D1D5DB] shadow-2xl">
          <span className="font-medium text-[#E6EDF3]">Please wait, AI is booting up.</span>
          <span className="ml-2 text-[#8B949E]">
            The interview starts instantly; hints, run, and grading will be ready shortly.
          </span>
        </div>
      )}
      <div className="w-[35%] flex flex-col border-r border-[#30363d] bg-[#0d1117] z-10 relative">
        <div className="p-4 border-b border-[#30363d] flex justify-between items-center bg-[#161b22]">
           <button onClick={() => navigate('/dashboard')} className="text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            ← Dashboard
          </button>
          <div className="text-xs text-[#8B949E] font-mono">ID: {sessionId?.toString().substring(0,6)}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[#30363d]">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`max-w-[90%] ${msg.sender === 'AI' ? 'self-start' : 'self-end'}`}>
              <div className={`text-xs mb-1.5 font-medium ${msg.sender === 'AI' ? 'text-[#D1D5DB]' : 'text-[#9BA3AF] text-right'}`}>
                {msg.sender === 'AI' ? 'System' : candidateName}
              </div>
              <div className={`p-4 rounded-lg border ${msg.sender === 'AI' ? 'bg-[#161b22] border-[#30363d] text-[#E6EDF3]' : 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#E6EDF3]'}`}>
                <div className="text-sm font-light leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                {msg.submitted_code && (
                    <div className="mt-3 bg-[#0d1117] p-3 rounded font-mono text-xs text-[#8B949E] line-clamp-3 border border-[#30363d]">
                        {msg.submitted_code}
                    </div>
                )}
                {msg.isPassed !== undefined && (
                  <div className={`mt-4 p-2 font-mono text-xs border rounded ${msg.isPassed ? 'bg-[#2ea043]/10 text-[#3fb950] border-[#2ea043]/30' : 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30'}`}>
                    {msg.isPassed ? 'Verification Passed' : 'Verification Failed'}
                    {msg.score !== undefined && <span className="ml-3">Score: {msg.score}</span>}
                    {msg.penalty > 0 && <span className="ml-3">Penalty: -{msg.penalty}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isEvaluating && <div className="text-xs text-[#8B949E] animate-pulse">Evaluating with AI. Please wait...</div>}
          {isFetchingNext && <div className="text-xs text-[#8B949E] animate-pulse">Initializing Phase 2...</div>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-[#30363d] bg-[#161b22]">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask for a hint or clarify constraints..."
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-4 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#6366F1] font-light placeholder-[#8B949E]"
            />
            <button 
              onClick={sendChatMessage}
              className="bg-[#21262d] border border-[#30363d] hover:border-[#6366F1] text-[#D1D5DB] hover:text-[#E6EDF3] px-4 py-2 rounded-md text-sm transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="w-[65%] flex flex-col z-10 relative bg-[#0d1117]">
        <div className="flex justify-between items-center p-3 border-b border-[#30363d] bg-[#161b22]">
          <div className="flex items-center gap-4 ml-4">
            <h2 className="text-sm font-medium text-[#D1D5DB]">{topic}</h2>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#0d1117] text-[#9BA3AF] border border-[#30363d] rounded-md px-3 py-1 focus:outline-none focus:border-[#6366F1] font-mono text-xs cursor-pointer hover:bg-[#21262d]"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>
          
          <div className="flex gap-2 mr-2">
            <button 
              onClick={runCode}
              disabled={isRunning}
              className="px-4 py-1.5 border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-md font-medium text-xs text-[#D1D5DB] transition-colors"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button 
              onClick={submitCode}
              disabled={!sessionId || isEvaluating}
              className="px-5 py-1.5 border border-transparent bg-[#6366F1] hover:bg-[#4f46e5] rounded-md font-medium text-xs text-white transition-colors"
            >
              Submit
            </button>
            
            {lastScore !== null && (
              <div className="hidden xl:flex items-center px-3 text-xs font-mono text-[#8B949E]">
                Last: {lastScore}/100
              </div>
            )}
            <button 
              onClick={loadNextQuestion}
              disabled={isFetchingNext}
              className="px-4 py-1.5 border border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] rounded-md font-medium text-xs text-[#9BA3AF] transition-colors ml-2"
            >
              {isFetchingNext ? 'Loading...' : 'Next'}
            </button>
            <button 
              onClick={finishInterview}
              className="px-4 py-1.5 border border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] rounded-md font-medium text-xs text-[#9BA3AF] transition-colors"
            >
              Finish
            </button>
          </div>
        </div>
        
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={userCode}
            onChange={(value) => setUserCode(value)}
            options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', padding: { top: 16 } }}
          />
        </div>

        <div className="h-[30%] border-t border-[#30363d] bg-[#0d1117] flex flex-col">
          <div className="flex border-b border-[#30363d] bg-[#161b22]">
            <div className="px-4 py-2 text-xs font-medium text-[#8B949E] flex items-center border-r border-[#30363d]">
              Test Cases
            </div>
            {testCases.map((tc, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveTestCase(idx)}
                className={`px-6 py-2 text-xs font-mono transition-colors ${activeTestCase === idx ? 'bg-[#0d1117] text-[#E6EDF3] border-t-2 border-t-[#6366F1]' : 'text-[#8B949E] hover:bg-[#21262d] hover:text-[#D1D5DB]'}`}
              >
                Case {idx + 1}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
            {testCases.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[#8B949E] mb-1">Input:</div>
                  <div className="bg-[#161b22] p-3 rounded-md text-[#D1D5DB] border border-[#30363d]">{testCases[activeTestCase]?.input}</div>
                </div>
                <div>
                  <div className="text-[#8B949E] mb-1">Expected Output:</div>
                  <div className="bg-[#161b22] p-3 rounded-md text-[#D1D5DB] border border-[#30363d]">{testCases[activeTestCase]?.expected_output}</div>
                </div>
                {testResults && testResults[activeTestCase] && (
                  <div>
                    <div className={`mb-1 ${testResults[activeTestCase].passed ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                      Actual Output {testResults[activeTestCase].passed ? '(Passed)' : '(Failed)'}:
                    </div>
                    <div className={`bg-[#161b22] p-3 rounded-md border ${testResults[activeTestCase].passed ? 'border-[#2ea043]/50 text-[#3fb950]' : 'border-[#f85149]/50 text-[#f85149]'}`}>
                      {testResults[activeTestCase].actual_output}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[#8B949E] flex h-full items-center justify-center font-sans">No test cases generated.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
