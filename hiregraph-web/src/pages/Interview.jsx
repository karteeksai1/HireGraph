import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

export default function Interview() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [candidateName, setCandidateName] = useState('Candidate');
  const [domain, setDomain] = useState('dsa');
  const [topic, setTopic] = useState('Linked Lists');
  const [language, setLanguage] = useState('python');
  const [userCode, setUserCode] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const chatEndRef = useRef(null);

  const domainTopics = {
    'dsa': ['Linked Lists', 'Arrays'],
    'system-design': ['Rate Limiting', 'Microservices'],
    'frontend': ['React Hooks', 'State Management'],
    'sql': ['Window Functions', 'Query Optimization']
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hiregraph_user'));
    if (user && user.name) {
      setCandidateName(user.name);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    setTopic(domainTopics[domain][0]);
  }, [domain]);

  const startInterview = async () => {
    try {
      const response = await axios.post('http://localhost:5001/api/interview/start', {
        candidateName,
        topic,
        domain
      });
      setSessionId(response.data.sessionId);
      setChatHistory([{
        sender: 'AI',
        message: `Welcome ${candidateName}. We will be focusing on ${topic} (${domain}) today. Please write your solution in ${language}.`
      }]);
    } catch (error) {
      console.error("Failed to start interview");
    }
  };

  const submitCode = async () => {
    if (!sessionId) return;
    setIsEvaluating(true);
    setChatHistory(prev => [...prev, { sender: 'USER', message: `Submitted ${language} code for evaluation.` }]);

    try {
      const response = await axios.post('http://localhost:5001/api/interview/submit', {
        sessionId,
        topic,
        domain,
        language,
        userCode
      });
      
      setChatHistory(prev => [...prev, { 
        sender: 'AI', 
        message: response.data.feedback,
        isPassed: response.data.isPassed
      }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { sender: 'AI', message: "System Error: Could not evaluate code." }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <div className="w-1/3 flex flex-col border-r border-gray-700 bg-gray-800">
        <div className="p-4 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm">
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold text-blue-400">HireGraph AI</h1>
          </div>
          {!sessionId ? (
            <div className="flex flex-col gap-3">
              <select 
                value={domain} 
                onChange={(e) => setDomain(e.target.value)}
                className="bg-gray-700 p-2 rounded text-sm text-white focus:outline-none border border-gray-600"
              >
                <option value="dsa">Data Structures & Algo</option>
                <option value="system-design">System Design</option>
                <option value="frontend">Frontend Engineering</option>
                <option value="sql">Database & SQL</option>
              </select>
              <select 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)}
                className="bg-gray-700 p-2 rounded text-sm text-white focus:outline-none border border-gray-600"
              >
                {domainTopics[domain].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-700 p-2 rounded text-sm text-white focus:outline-none border border-gray-600"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="sql">SQL</option>
              </select>
              <button 
                onClick={startInterview}
                className="bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold transition-colors mt-2"
              >
                Start Interview
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Session ID: {sessionId} | {topic} | Lang: {language}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`p-3 rounded-lg max-w-[90%] ${msg.sender === 'AI' ? 'bg-gray-700 self-start' : 'bg-blue-600 self-end'}`}>
              <div className="text-xs text-gray-400 mb-1">{msg.sender}</div>
              <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
              {msg.isPassed !== undefined && (
                <div className={`mt-2 text-xs font-bold ${msg.isPassed ? 'text-green-400' : 'text-red-400'}`}>
                  {msg.isPassed ? '✓ TEST PASSED' : '✕ TEST FAILED'}
                </div>
              )}
            </div>
          ))}
          {isEvaluating && (
            <div className="text-sm text-gray-400 animate-pulse">AI is grading your {language} submission...</div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="w-2/3 flex flex-col">
        <div className="flex justify-between items-center p-2 border-b border-gray-700 bg-gray-900">
          <span className="text-sm text-gray-400 font-mono ml-4">solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'sql'}</span>
          <button 
            onClick={submitCode}
            disabled={!sessionId || isEvaluating}
            className={`px-6 py-2 rounded font-bold transition-colors ${!sessionId || isEvaluating ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}
          >
            Submit Code
          </button>
        </div>
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={userCode}
            onChange={(value) => setUserCode(value)}
            options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
          />
        </div>
      </div>
    </div>
  );
}