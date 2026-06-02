import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  let storedInterview = null;
  try {
    storedInterview = JSON.parse(localStorage.getItem('hiregraph_active_interview') || 'null');
  } catch {
    localStorage.removeItem('hiregraph_active_interview');
  }
  const state = location.state || storedInterview || {};

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
    if (!location.state && !storedInterview?.sessionId) {
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
  }, [location.state, navigate, chatHistory.length, candidateName, topic, questionText, difficulty, storedInterview?.sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem('hiregraph_active_interview', JSON.stringify({
      sessionId,
      candidateName,
      domain,
      difficulty,
      topic,
      question: questionText,
      testCases,
      boilerplates,
      aiBooting: aiStatus !== 'ready'
    }));
  }, [sessionId, candidateName, domain, difficulty, topic, questionText, testCases, boilerplates, aiStatus]);

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
      localStorage.removeItem('hiregraph_active_interview');
      navigate(`/scorecard/${sessionId}`);
    } catch {
      alert("Failed to close session.");
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] font-sans overflow-hidden">
      {aiStatus !== 'ready' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-[#f0b23d]/40 bg-[#11100c] px-5 py-3 text-sm text-[#f2e6c8] shadow-2xl">
          <span className="font-medium text-[#fff7e3]">Please wait, AI is booting up.</span>
          <span className="ml-2 text-[#b9aa8d]">
            The interview starts instantly; hints, run, and grading will be ready shortly.
          </span>
        </div>
      )}
      <div className="w-[35%] flex flex-col border-r border-[#3a2b14] bg-[#050505] z-10 relative">
        <div className="p-4 border-b border-[#3a2b14] flex justify-between items-center bg-[#11100c]">
           <button onClick={() => navigate('/dashboard')} className="text-sm text-[#b9aa8d] hover:text-[#fff7e3] transition-colors">
            ← Dashboard
          </button>
          <div className="text-xs text-[#b9aa8d] font-mono">ID: {sessionId?.toString().substring(0,6)}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[#3a2b14]">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`max-w-[90%] ${msg.sender === 'AI' ? 'self-start' : 'self-end'}`}>
              <div className={`text-xs mb-1.5 font-medium ${msg.sender === 'AI' ? 'text-[#f2e6c8]' : 'text-[#c8b994] text-right'}`}>
                {msg.sender === 'AI' ? 'System' : candidateName}
              </div>
              <div className={`p-4 rounded-lg border ${msg.sender === 'AI' ? 'bg-[#11100c] border-[#3a2b14] text-[#fff7e3]' : 'bg-[#f0b23d]/10 border-[#f0b23d]/30 text-[#fff7e3]'}`}>
                <div className="text-sm font-light leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                {msg.submitted_code && (
                    <div className="mt-3 bg-[#050505] p-3 rounded font-mono text-xs text-[#b9aa8d] line-clamp-3 border border-[#3a2b14]">
                        {msg.submitted_code}
                    </div>
                )}
                {msg.isPassed !== undefined && (
                  <div className={`mt-4 p-2 font-mono text-xs border rounded ${msg.isPassed ? 'bg-[#f0b23d]/10 text-[#f0b23d] border-[#f0b23d]/30' : 'bg-[#f0b23d]/10 text-[#f0b23d] border-[#f0b23d]/30'}`}>
                    {msg.isPassed ? 'Verification Passed' : 'Verification Failed'}
                    {msg.score !== undefined && <span className="ml-3">Score: {msg.score}</span>}
                    {msg.penalty > 0 && <span className="ml-3">Penalty: -{msg.penalty}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isEvaluating && <div className="text-xs text-[#b9aa8d] animate-pulse">Evaluating with AI. Please wait...</div>}
          {isFetchingNext && <div className="text-xs text-[#b9aa8d] animate-pulse">Initializing Phase 2...</div>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-[#3a2b14] bg-[#11100c]">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask for a hint or clarify constraints..."
              className="flex-1 bg-[#050505] border border-[#3a2b14] rounded-md px-4 py-2 text-sm text-[#fff7e3] focus:outline-none focus:border-[#f0b23d] font-light placeholder-[#b9aa8d]"
            />
            <button 
              onClick={sendChatMessage}
              className="bg-[#1a1710] border border-[#3a2b14] hover:border-[#f0b23d] text-[#f2e6c8] hover:text-[#fff7e3] px-4 py-2 rounded-md text-sm transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="w-[65%] flex flex-col z-10 relative bg-[#050505]">
        <div className="flex justify-between items-center p-3 border-b border-[#3a2b14] bg-[#11100c]">
          <div className="flex items-center gap-4 ml-4">
            <h2 className="text-sm font-medium text-[#f2e6c8]">{topic}</h2>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#050505] text-[#c8b994] border border-[#3a2b14] rounded-md px-3 py-1 focus:outline-none focus:border-[#f0b23d] font-mono text-xs cursor-pointer hover:bg-[#1a1710]"
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
              className="px-4 py-1.5 border border-[#3a2b14] bg-[#1a1710] hover:bg-[#3a2b14] rounded-md font-medium text-xs text-[#f2e6c8] transition-colors"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button 
              onClick={submitCode}
              disabled={!sessionId || isEvaluating}
              className="px-5 py-1.5 border border-transparent bg-[#f0b23d] hover:bg-[#d9961f] rounded-md font-medium text-xs text-[#050505] transition-colors"
            >
              Submit
            </button>
            
            {lastScore !== null && (
              <div className="hidden xl:flex items-center px-3 text-xs font-mono text-[#b9aa8d]">
                Last: {lastScore}/100
              </div>
            )}
            <button 
              onClick={loadNextQuestion}
              disabled={isFetchingNext}
              className="px-4 py-1.5 border border-[#3a2b14] bg-[#050505] hover:bg-[#1a1710] rounded-md font-medium text-xs text-[#c8b994] transition-colors ml-2"
            >
              {isFetchingNext ? 'Loading...' : 'Next'}
            </button>
            <button 
              onClick={finishInterview}
              className="px-4 py-1.5 border border-[#3a2b14] bg-[#050505] hover:bg-[#1a1710] rounded-md font-medium text-xs text-[#c8b994] transition-colors"
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

        <div className="h-[30%] border-t border-[#3a2b14] bg-[#050505] flex flex-col">
          <div className="flex border-b border-[#3a2b14] bg-[#11100c]">
            <div className="px-4 py-2 text-xs font-medium text-[#b9aa8d] flex items-center border-r border-[#3a2b14]">
              Test Cases
            </div>
            {testCases.map((tc, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveTestCase(idx)}
                className={`px-6 py-2 text-xs font-mono transition-colors ${activeTestCase === idx ? 'bg-[#050505] text-[#fff7e3] border-t-2 border-t-[#f0b23d]' : 'text-[#b9aa8d] hover:bg-[#1a1710] hover:text-[#f2e6c8]'}`}
              >
                Case {idx + 1}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
            {testCases.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[#b9aa8d] mb-1">Input:</div>
                  <div className="bg-[#11100c] p-3 rounded-md text-[#f2e6c8] border border-[#3a2b14]">{testCases[activeTestCase]?.input}</div>
                </div>
                <div>
                  <div className="text-[#b9aa8d] mb-1">Expected Output:</div>
                  <div className="bg-[#11100c] p-3 rounded-md text-[#f2e6c8] border border-[#3a2b14]">{testCases[activeTestCase]?.expected_output}</div>
                </div>
                {testResults && testResults[activeTestCase] && (
                  <div>
                    <div className={`mb-1 ${testResults[activeTestCase].passed ? 'text-[#f0b23d]' : 'text-[#f0b23d]'}`}>
                      Actual Output {testResults[activeTestCase].passed ? '(Passed)' : '(Failed)'}:
                    </div>
                    <div className={`bg-[#11100c] p-3 rounded-md border ${testResults[activeTestCase].passed ? 'border-[#f0b23d]/50 text-[#f0b23d]' : 'border-[#f0b23d]/50 text-[#f0b23d]'}`}>
                      {testResults[activeTestCase].actual_output}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[#b9aa8d] flex h-full items-center justify-center font-sans">No test cases generated.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
