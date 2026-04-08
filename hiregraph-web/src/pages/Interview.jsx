import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';

export default function Interview() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [candidateName, setCandidateName] = useState('Karteek');
  const [topic, setTopic] = useState('Linked Lists');
  const [userCode, setUserCode] = useState('def solution():\n    pass');
  const [chatHistory, setChatHistory] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const chatEndRef = useRef(null);

  const startInterview = async () => {
    try {
      const response = await axios.post('http://localhost:5001/api/interview/start', {
        candidateName,
        topic
      });
      setSessionId(response.data.sessionId);
      setChatHistory([{
        sender: 'AI',
        message: `Welcome ${candidateName}. We will be focusing on ${topic} today. Please write your solution in the editor.`
      }]);
    } catch (error) {
      console.error("Failed to start interview");
    }
  };

  const submitCode = async () => {
    if (!sessionId) return;
    setIsEvaluating(true);
    setChatHistory(prev => [...prev, { sender: 'USER', message: "Submitted code for evaluation." }]);

    try {
      const response = await axios.post('http://localhost:5001/api/interview/submit', {
        sessionId,
        topic,
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
            <div className="flex flex-col gap-2">
              <select 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)}
                className="bg-gray-700 p-2 rounded text-sm text-white focus:outline-none"
              >
                <option value="Linked Lists">Linked Lists</option>
                <option value="Arrays">Arrays</option>
                <option value="Stacks">Stacks</option>
              </select>
              <button 
                onClick={startInterview}
                className="bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold transition-colors"
              >
                Start Interview
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Session ID: {sessionId} | Topic: {topic}
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
            <div className="text-sm text-gray-400 animate-pulse">AI is grading your submission...</div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="w-2/3 flex flex-col">
        <div className="flex justify-between items-center p-2 border-b border-gray-700 bg-gray-900">
          <span className="text-sm text-gray-400 font-mono ml-4">main.py</span>
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
            defaultLanguage="python"
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