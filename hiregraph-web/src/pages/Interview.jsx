import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { wakeAI } from '../wakeAI';

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7H13M8 2L13 7L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

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

  const sessionId        = state.sessionId || null;
  const candidateName    = state.candidateName || 'Candidate';
  const domain           = state.domain || 'dsa';
  const difficulty       = state.difficulty || 'medium';
  const [topic, setTopic]               = useState(state.topic || 'Question');
  const [questionText, setQuestionText] = useState(state.question || '');
  const [language, setLanguage]         = useState('python');
  const [boilerplates, setBoilerplates] = useState(state.boilerplates || {});
  const [userCode, setUserCode]         = useState('');
  const [chatHistory, setChatHistory]   = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [testCases, setTestCases]       = useState(state.testCases || []);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [testResults, setTestResults]   = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRunning, setIsRunning]       = useState(false);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [lastScore, setLastScore]       = useState(null);
  const [submitState, setSubmitState]   = useState('idle');
  const chatEndRef  = useRef(null);
  const retryTimerRef = useRef(null);
  const backendUrl  = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002';

  useEffect(() => {
    wakeAI();
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!location.state && !storedInterview?.sessionId) { navigate('/setup'); return; }
    if (chatHistory.length === 0 && questionText) {
      setChatHistory([{
        sender: 'AI',
        message: `Phase 1 — ${difficulty.toUpperCase()}\n\n${topic}\n\n${questionText}`
      }]);
    }
  }, [location.state, navigate, chatHistory.length, topic, questionText, difficulty, storedInterview?.sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem('hiregraph_active_interview', JSON.stringify({
      sessionId, candidateName, domain, difficulty, topic, question: questionText, testCases, boilerplates
    }));
  }, [sessionId, candidateName, domain, difficulty, topic, questionText, testCases, boilerplates]);

  useEffect(() => {
    setUserCode(boilerplates?.[language] || '');
  }, [language, boilerplates, questionNumber]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !sessionId) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'USER', message: userMsg }]);
    try {
      const res = await axios.post(`${backendUrl}/api/interview/chat`, {
        sessionId, domain, message: userMsg, questionText
      });
      setChatHistory(prev => [...prev, { sender: 'AI', message: res.data.reply }]);
    } catch (error) {
      setChatHistory(prev => [...prev, {
        sender: 'AI',
        message: error.response?.data?.error || 'AI service is waking up, please retry.'
      }]);
    }
  };

  const runCode = async () => {
    if (!userCode.trim() || testCases.length === 0) return;
    setIsRunning(true);
    setTestResults(null);
    try {
      const res = await axios.post(`${backendUrl}/api/interview/run`, { code: userCode, language, testCases });
      setTestResults(res.data.results);
    } catch { console.error('Run failed'); }
    finally { setIsRunning(false); }
  };

  const performSubmit = async (isRetry = false) => {
    if (!sessionId || !userCode.trim()) return;
    setIsEvaluating(true);
    if (!isRetry) {
      setChatHistory(prev => [...prev, {
        sender: 'USER', message: `Submitted ${language} solution.`, submitted_code: userCode
      }]);
    }
    try {
      const res = await axios.post(`${backendUrl}/api/interview/submit`, {
        sessionId, topic, domain, language, userCode, questionText
      });
      setChatHistory(prev => [...prev, {
        sender: 'AI',
        message: res.data.feedback,
        isPassed: res.data.isPassed,
        score: res.data.score,
        rawScore: res.data.rawScore,
        penalty: res.data.penalty
      }]);
      setLastScore(res.data.score);
      setSubmitState('idle');
      setIsEvaluating(false);
    } catch (error) {
      if (error.response?.status === 503) {
        if (!isRetry) {
          setSubmitState('auto_retrying');
          retryTimerRef.current = setTimeout(() => performSubmit(true), 15000);
          return;
        } else {
          setSubmitState('retry_ready');
        }
      } else {
        setSubmitState('idle');
      }
      setIsEvaluating(false);
      setChatHistory(prev => [...prev, {
        sender: 'AI',
        message: error.response?.data?.error || 'AI service is waking up, please retry.'
      }]);
    }
  };

  const loadNextQuestion = async () => {
    if (!sessionId) return;
    setIsFetchingNext(true);
    try {
      const res = await axios.post(`${backendUrl}/api/interview/next`, {
        sessionId, domain, difficulty, previousTopic: topic
      });
      setTopic(res.data.topic);
      setQuestionText(res.data.question);
      setTestCases(res.data.testCases);
      setBoilerplates(res.data.boilerplates);
      setTestResults(null);
      setActiveTestCase(0);
      setLastScore(null);
      setQuestionNumber(prev => prev + 1);
      setChatHistory(prev => [...prev, {
        sender: 'AI',
        message: `Phase ${questionNumber + 1} — ${difficulty.toUpperCase()}\n\n${res.data.topic}\n\n${res.data.question}`
      }]);
    } catch {
      alert('Failed to load next question.');
    } finally {
      setIsFetchingNext(false);
    }
  };

  const finishInterview = async () => {
    if (!sessionId) return;
    try {
      await axios.post(`${backendUrl}/api/interview/finish`, { sessionId });
      localStorage.removeItem('hiregraph_active_interview');
      navigate(`/scorecard/${sessionId}`);
    } catch { alert('Failed to close session.'); }
  };

  return (
    <div className="interview-shell">
      {/* ── Left pane: chat ── */}
      <div className="interview-pane-left">
        {/* Pane header */}
        <div style={{
          borderBottom: '1px solid var(--rule)',
          padding: '0 1rem',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost btn-sm"
            style={{ gap: '0.375rem', display: 'flex', alignItems: 'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M11 7H3M7 3L3 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
            </svg>
            Dashboard
          </button>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.625rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Session {sessionId?.toString().substring(0, 6)}
          </div>
        </div>

        {/* Chat messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
        }}>
          {chatHistory.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.sender === 'AI' ? 'flex-start' : 'flex-end', maxWidth: '92%' }}>
              <div style={{
                fontFamily: 'IBM Plex Mono',
                fontSize: '0.5625rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: '0.3rem',
                paddingLeft: msg.sender === 'AI' ? '0' : undefined,
                textAlign: msg.sender === 'AI' ? 'left' : 'right',
              }}>
                {msg.sender === 'AI' ? 'Interviewer' : candidateName}
              </div>
              <div className={msg.sender === 'AI' ? 'chat-bubble-ai' : 'chat-bubble-user'}>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.8125rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {msg.message}
                </div>
                {msg.submitted_code && (
                  <div style={{
                    marginTop: '0.75rem',
                    background: 'var(--ink)',
                    padding: '0.75rem',
                    fontFamily: 'IBM Plex Mono',
                    fontSize: '0.6875rem',
                    color: '#a0a0a0',
                    overflow: 'hidden',
                    maxHeight: '80px',
                    lineHeight: 1.5,
                    borderTop: '1px solid #3a3a3a',
                  }}>
                    {msg.submitted_code.slice(0, 300)}{msg.submitted_code.length > 300 ? '\n...' : ''}
                  </div>
                )}
                {msg.isPassed !== undefined && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    gap: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: 'IBM Plex Mono',
                    fontSize: '0.6875rem',
                    color: msg.sender === 'AI' ? 'var(--ink)' : 'var(--paper)',
                  }}>
                    <span style={{ fontWeight: 600, color: msg.isPassed ? 'var(--ink)' : 'var(--accent)' }}>
                      {msg.isPassed ? '✓ PASS' : '✗ FAIL'}
                    </span>
                    {msg.score !== undefined && <span>Score: {msg.score}/100</span>}
                    {msg.penalty > 0 && <span>Penalty: -{msg.penalty}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isEvaluating && (
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: 'var(--muted)', letterSpacing: '0.08em' }} className="blinking">
              Evaluating...
            </div>
          )}
          {isFetchingNext && (
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: 'var(--muted)', letterSpacing: '0.08em' }} className="blinking">
              Loading next question...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div style={{
          borderTop: '1px solid var(--rule)',
          padding: '0.75rem',
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
            placeholder="Ask for a hint or clarify constraints..."
            className="field-input"
            style={{ flex: 1, fontSize: '0.8125rem' }}
          />
          <button onClick={sendChatMessage} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <SendIcon />
          </button>
        </div>
      </div>

      {/* ── Right pane: editor + tests ── */}
      <div className="interview-pane-right">
        {/* Editor toolbar */}
        <div style={{
          borderBottom: '1px solid var(--rule)',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.75rem 0 1rem',
          background: '#1A1A1A',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: '#c0b8a8', fontWeight: 500 }}>
              {topic}
            </span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="mono-select"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {lastScore !== null && (
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: '#6b6560', padding: '0 0.5rem' }}>
                Last: {lastScore}/100
              </span>
            )}
            <button onClick={runCode} disabled={isRunning} className="btn btn-sm" style={{ background: '#2a2a2a', color: '#c0b8a8', borderColor: '#3a3a3a' }}>
              {isRunning ? '...' : 'Run'}
            </button>
            {submitState === 'auto_retrying' ? (
              <button disabled className="btn btn-sm" style={{ background: '#2a2a2a', color: '#6b6560', borderColor: '#3a3a3a', cursor: 'wait' }}>
                Retrying...
              </button>
            ) : submitState === 'retry_ready' ? (
              <button onClick={() => performSubmit(false)} disabled={isEvaluating} className="btn btn-accent btn-sm">
                Retry Submit
              </button>
            ) : (
              <button onClick={() => performSubmit(false)} disabled={!sessionId || isEvaluating} className="btn btn-accent btn-sm">
                {isEvaluating ? '...' : 'Submit'}
              </button>
            )}
            <button onClick={loadNextQuestion} disabled={isFetchingNext} className="btn btn-sm" style={{ background: '#2a2a2a', color: '#c0b8a8', borderColor: '#3a3a3a' }}>
              {isFetchingNext ? '...' : 'Next →'}
            </button>
            <button onClick={finishInterview} className="btn btn-sm" style={{ background: '#2a2a2a', color: '#6b6560', borderColor: '#3a3a3a' }}>
              Finish
            </button>
          </div>
        </div>

        {/* Monaco editor */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={userCode}
            onChange={v => setUserCode(v)}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
              wordWrap: 'on',
              padding: { top: 16 },
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {/* Test cases panel */}
        <div style={{
          height: '30%',
          borderTop: '1px solid var(--rule)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--paper)',
          flexShrink: 0,
        }}>
          {/* Tab bar */}
          <div style={{
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface)',
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily: 'IBM Plex Mono',
              fontSize: '0.5625rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              padding: '0 1rem',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              borderRight: '1px solid var(--rule)',
            }}>
              Test Cases
            </div>
            {testCases.map((_, idx) => {
              const result = testResults?.[idx];
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTestCase(idx)}
                  className={`tc-tab ${activeTestCase === idx ? 'is-active' : ''}`}
                  style={{
                    color: result ? (result.passed ? 'var(--ink)' : 'var(--accent)') : undefined,
                  }}
                >
                  {idx + 1}
                  {result && (
                    <span style={{ marginLeft: '0.25rem' }}>
                      {result.passed ? '✓' : '✗'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Test case content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem 1rem', fontFamily: 'IBM Plex Mono', fontSize: '0.75rem' }}>
            {testCases.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.375rem' }}>
                    Input
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '0.5rem 0.75rem', color: 'var(--ink)' }}>
                    {testCases[activeTestCase]?.input}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.375rem' }}>
                    Expected Output
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', padding: '0.5rem 0.75rem', color: 'var(--ink)' }}>
                    {testCases[activeTestCase]?.expected_output}
                  </div>
                </div>
                {testResults?.[activeTestCase] && (
                  <div>
                    <div style={{
                      fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                      color: testResults[activeTestCase].passed ? 'var(--ink)' : 'var(--accent)',
                      marginBottom: '0.375rem',
                    }}>
                      Actual Output ({testResults[activeTestCase].passed ? 'Passed' : 'Failed'})
                    </div>
                    <div style={{
                      background: 'var(--surface)',
                      border: `1px solid ${testResults[activeTestCase].passed ? 'var(--rule)' : 'var(--accent)'}`,
                      padding: '0.5rem 0.75rem',
                      color: testResults[activeTestCase].passed ? 'var(--ink)' : 'var(--accent)',
                    }}>
                      {testResults[activeTestCase].actual_output}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                No test cases available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
