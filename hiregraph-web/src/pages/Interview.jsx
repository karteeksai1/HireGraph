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
  const [difficulty, setDifficulty] = useState(state.difficulty || 'medium');
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
          message: `Welcome ${candidateName}. Phase 1 initiated. Difficulty: ${difficulty.toUpperCase()}.\n\nChallenge: ${topic}\n\n${questionText}`
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

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !sessionId) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'USER', message: userMsg }]);

    try {
      const response = await axios.post('http://localhost:5002/api/interview/chat', {
        sessionId,
        domain,
        message: userMsg,
        questionText
      });
      
      setChatHistory(prev => [...prev, { sender: 'AI', message: response.data.reply }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { sender: 'AI', message: "Communication error." }]);
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
      const response = await axios.post('http://localhost:5002/api/interview/run', {
        code: userCode,
        language,
        testCases
      });
      setTestResults(response.data.results);
    } catch (error) {
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
      message: `Submitted ${language.toUpperCase()} architecture for evaluation.`,
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
      setChatHistory(prev => [...prev, { sender: 'AI', message: "Evaluation system offline." }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const loadNextQuestion = async () => {
      if (!sessionId) return;
      setIsFetchingNext(true);

      try {
          const response = await axios.post('http://localhost:5002/api/interview/next', {
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
          setQuestionNumber(2);
          
          setChatHistory(prev => [...prev, { 
            sender: 'AI', 
            message: `PHASE 2 INITIATED.\n\nNew Challenge: ${response.data.topic}\n\n${response.data.question}` 
          }]);

      } catch (error) {
          alert("Failed to load Phase 2.");
      } finally {
          setIsFetchingNext(false);
      }
  };

  const finishInterview = async () => {
    if (!sessionId) return;
    try {
      await axios.post('http://localhost:5002/api/interview/finish', { sessionId });
      navigate(`/scorecard/${sessionId}`);
    } catch (error) {
      alert("Failed to close session.");
    }
  };

  return (
    <div className="flex h-screen bg-[#030000] text-white font-sans overflow-hidden">
      <div className="w-[35%] flex flex-col border-r border-red-900/30 bg-black/40 backdrop-blur-md z-10 relative">
        <div className="p-4 border-b border-red-900/30 flex justify-between items-center">
           <button onClick={() => navigate('/dashboard')} className="text-[10px] tracking-[0.3em] text-red-200/50 hover:text-white uppercase">
            ← Abort
          </button>
          <div className="text-xs text-red-500/70 tracking-[0.2em] font-mono">ID:{sessionId?.toString().substring(0,6)} | P{questionNumber}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-red-900/50">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`max-w-[90%] ${msg.sender === 'AI' ? 'self-start' : 'self-end'}`}>
              <div className={`text-[10px] tracking-[0.2em] uppercase mb-2 ${msg.sender === 'AI' ? 'text-red-400' : 'text-orange-400 text-right'}`}>
                {msg.sender === 'AI' ? 'System' : candidateName}
              </div>
              <div className={`p-4 rounded-sm border ${msg.sender === 'AI' ? 'bg-red-950/20 border-red-900/30 text-red-100/90' : 'bg-orange-950/20 border-orange-900/30 text-orange-100/90'}`}>
                <div className="text-sm font-light leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                {msg.submitted_code && (
                    <div className="mt-3 bg-black/60 p-3 rounded-sm font-mono text-[10px] text-gray-400 line-clamp-3 border border-orange-900/30">
                        {msg.submitted_code}
                    </div>
                )}
                {msg.isPassed !== undefined && (
                  <div className={`mt-4 p-2 font-mono text-[10px] tracking-widest uppercase border ${msg.isPassed ? 'bg-green-950/20 text-green-400 border-green-900/50' : 'bg-red-950/20 text-red-400 border-red-900/50'}`}>
                    {msg.isPassed ? 'Verification Passed' : 'Verification Failed'}
                    {msg.score !== undefined && <span className="ml-3">Score: {msg.score}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isEvaluating && <div className="text-xs tracking-widest uppercase text-red-500 animate-pulse">Evaluating Architecture...</div>}
          {isFetchingNext && <div className="text-xs tracking-widest uppercase text-orange-500 animate-pulse">Initializing Phase 2...</div>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-red-900/30 bg-black/60">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Request assistance or clarify limits..."
              className="flex-1 bg-red-950/20 border border-red-900/50 rounded-sm px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 font-light"
            />
            <button 
              onClick={sendChatMessage}
              className="bg-red-900/40 border border-red-800/50 hover:bg-orange-900/40 hover:border-orange-500/50 px-4 py-2 rounded-sm text-xs tracking-widest uppercase transition-colors"
            >
              Transmit
            </button>
          </div>
        </div>
      </div>

      <div className="w-[65%] flex flex-col z-10 relative bg-[#0a0a0a]">
        <div className="flex justify-between items-center p-3 border-b border-red-900/30 bg-black/60 backdrop-blur-md">
          <div className="flex items-center gap-4 ml-4">
            <h2 className="text-sm font-light tracking-[0.1em] text-white uppercase">{topic}</h2>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-red-950/30 text-orange-200 border border-red-900/50 rounded-sm px-3 py-1 focus:outline-none focus:border-orange-500 font-mono text-xs cursor-pointer hover:bg-red-900/50"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>
          
          <div className="flex gap-3 mr-2">
            <button 
              onClick={runCode}
              disabled={isRunning}
              className="px-4 py-1.5 border border-gray-600 bg-gray-800/50 hover:bg-gray-700 rounded-sm font-light text-[10px] tracking-widest uppercase transition-colors text-gray-300"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button 
              onClick={submitCode}
              disabled={!sessionId || isEvaluating}
              className="px-6 py-1.5 border border-orange-500/50 bg-orange-950/40 hover:bg-orange-900/60 rounded-sm font-light text-[10px] tracking-widest uppercase transition-colors text-orange-100 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
            >
              Submit
            </button>
            
            {questionNumber === 1 ? (
                <button 
                  onClick={loadNextQuestion}
                  disabled={isFetchingNext}
                  className="px-4 py-1.5 border border-red-800/50 bg-red-950/40 hover:bg-red-900/60 rounded-sm font-light text-[10px] tracking-widest uppercase transition-colors text-red-300 ml-4"
                >
                  {isFetchingNext ? 'Loading...' : 'Skip / Next'}
                </button>
            ) : (
                <button 
                  onClick={finishInterview}
                  className="px-4 py-1.5 border border-red-800/50 bg-red-950/40 hover:bg-red-900/60 rounded-sm font-light text-[10px] tracking-widest uppercase transition-colors text-red-300 ml-4"
                >
                  Finish
                </button>
            )}
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

        <div className="h-[30%] border-t border-red-900/30 bg-black/80 flex flex-col">
          <div className="flex border-b border-red-900/30">
            <div className="px-4 py-2 text-[10px] tracking-[0.2em] text-red-500/70 uppercase flex items-center border-r border-red-900/30">
              Test Cases
            </div>
            {testCases.map((tc, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveTestCase(idx)}
                className={`px-6 py-2 text-xs font-mono transition-colors ${activeTestCase === idx ? 'bg-red-950/40 text-orange-300 border-b-2 border-orange-500' : 'text-gray-500 hover:bg-red-950/20 hover:text-gray-300'}`}
              >
                Case {idx + 1}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
            {testCases.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-gray-500 mb-1">Input:</div>
                  <div className="bg-[#1e1e1e] p-3 rounded-sm text-gray-300 border border-gray-800">{testCases[activeTestCase]?.input}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Expected Output:</div>
                  <div className="bg-[#1e1e1e] p-3 rounded-sm text-gray-300 border border-gray-800">{testCases[activeTestCase]?.expected_output}</div>
                </div>
                {testResults && testResults[activeTestCase] && (
                  <div>
                    <div className={`mb-1 ${testResults[activeTestCase].passed ? 'text-green-500' : 'text-red-500'}`}>
                      Actual Output {testResults[activeTestCase].passed ? '(Passed)' : '(Failed)'}:
                    </div>
                    <div className={`bg-[#1e1e1e] p-3 rounded-sm border ${testResults[activeTestCase].passed ? 'border-green-900/50 text-green-300' : 'border-red-900/50 text-red-300'}`}>
                      {testResults[activeTestCase].actual_output}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-600 flex h-full items-center justify-center">No test cases generated.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}