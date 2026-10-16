import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { wakeAI } from '../wakeAI';

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M11 7H3M7 3L3 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

const DOMAIN_META = {
  dsa: {
    label: 'Data Structures & Algorithms',
    note: 'Arrays, graphs, DP, trees',
  },
  'system-design': {
    label: 'System Design',
    note: 'Scalability, architecture, trade-offs',
  },
  frontend: {
    label: 'Frontend Engineering',
    note: 'DOM, React, web APIs, CSS',
  },
  sql: {
    label: 'Database & SQL',
    note: 'Queries, schema design, indexing',
  },
};

const DIFFICULTIES = [
  { key: 'easy',   label: 'Easy',   note: 'Warm-up problems' },
  { key: 'medium', label: 'Medium', note: 'Interview level' },
  { key: 'hard',   label: 'Hard',   note: 'Senior / Staff level' },
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [candidateName, setCandidateName] = useState('Candidate');
  const [userId, setUserId] = useState(null);
  const [domain, setDomain] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hiregraph_user'));
    if (user?.name) {
      setCandidateName(user.name);
      setUserId(user.id);
      wakeAI();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const startInterview = async () => {
    if (!domain || !difficulty || !userId) return;
    setIsStarting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/interview/start`,
        { userId, candidateName, domain, difficulty }
      );
      const payload = {
        sessionId: response.data.sessionId,
        question: response.data.question,
        topic: response.data.topic,
        testCases: response.data.testCases,
        boilerplates: response.data.boilerplates,
        domain,
        difficulty,
        candidateName,
        aiBooting: response.data.aiBooting,
      };
      navigate('/interview', { state: payload });
      localStorage.setItem('hiregraph_active_interview', JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to start:', err);
      alert('Server is waking up or busy. Please wait 1 minute and try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const ready = domain && difficulty && !isStarting;

  return (
    <div className="page-shell">
      {/* Header */}
      <header className="site-header">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-ghost btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <IconBack /> Dashboard
        </button>
        <div className="logo-mark">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="1" width="18" height="18" stroke="var(--ink)" strokeWidth="1.5"/>
            <path d="M5 10 L10 5 L15 10 L10 15 Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
          </svg>
          HireGraph
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Setup
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Title strip */}
        <div style={{
          borderBottom: '1px solid var(--rule)',
          padding: '2.5rem 3rem',
          background: 'var(--surface)',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="t-subheading" style={{ marginBottom: '0.75rem' }}>Session Configuration</div>
            <h1 className="t-heading" style={{ marginBottom: '0.5rem' }}>Configure your interview</h1>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Questions are loaded from a local bank. AI is used for hints and evaluation only.
            </p>
          </div>
        </div>

        {/* Config area */}
        <div style={{ flex: 1, padding: '2.5rem 3rem' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Domain */}
            <section>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--rule)', paddingBottom: '0.5rem' }}>
                <span className="section-num">01</span>
                <span className="t-subheading">Domain</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1px', border: '1px solid var(--rule)' }}>
                {Object.entries(DOMAIN_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setDomain(key)}
                    className="select-btn"
                    style={{
                      borderRight: '1px solid var(--rule)',
                      ...(domain === key ? {
                        background: 'var(--ink)',
                        color: 'var(--paper)',
                        borderColor: 'var(--ink)',
                      } : {}),
                    }}
                  >
                    <div style={{ fontWeight: domain === key ? 600 : 400, marginBottom: '0.25rem', fontSize: '0.8125rem', color: domain === key ? 'var(--paper)' : 'var(--ink)' }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: domain === key ? '#c0b8a8' : 'var(--muted)' }}>
                      {meta.note}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Difficulty */}
            <section style={{ opacity: domain ? 1 : 0.35, pointerEvents: domain ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--rule)', paddingBottom: '0.5rem' }}>
                <span className="section-num">02</span>
                <span className="t-subheading">Difficulty</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', border: '1px solid var(--rule)' }}>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.key}
                    onClick={() => setDifficulty(d.key)}
                    className="select-btn"
                    style={{
                      borderRight: '1px solid var(--rule)',
                      ...(difficulty === d.key ? {
                        background: 'var(--ink)',
                        color: 'var(--paper)',
                        borderColor: 'var(--ink)',
                      } : {}),
                    }}
                  >
                    <div style={{ fontWeight: difficulty === d.key ? 600 : 400, marginBottom: '0.25rem', fontSize: '0.8125rem', color: difficulty === d.key ? 'var(--paper)' : 'var(--ink)' }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: difficulty === d.key ? '#c0b8a8' : 'var(--muted)' }}>
                      {d.note}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Summary + CTA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--rule)', paddingTop: '1.5rem' }}>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--muted)' }}>
                {domain && difficulty ? (
                  <span>
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{DOMAIN_META[domain]?.label}</span>
                    {' · '}
                    <span style={{ color: 'var(--ink)', fontWeight: 600, textTransform: 'capitalize' }}>{difficulty}</span>
                  </span>
                ) : (
                  <span>Select domain and difficulty to continue</span>
                )}
              </div>
              <button
                onClick={startInterview}
                disabled={!ready}
                className="btn btn-primary"
              >
                {isStarting ? 'Starting...' : 'Begin Session →'}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
