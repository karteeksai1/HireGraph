import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ScoreBar({ score }) {
  if (score === null || score === undefined) return null;
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? 'var(--ink)' : pct >= 50 ? '#8C6820' : 'var(--accent)';
  return (
    <div style={{ marginTop: '0.375rem', height: '2px', background: 'var(--rule)', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function PastInterviews() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const userStr = localStorage.getItem('hiregraph_user');
        if (!userStr) { navigate('/login'); return; }
        const user = JSON.parse(userStr);
        if (!user?.id) { navigate('/login'); return; }
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/sessions/${user.id}`
        );
        setSessions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load sessions:', err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [navigate]);

  return (
    <div className="page-shell">
      {/* Header */}
      <header className="site-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M11 7H3M7 3L3 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
          Dashboard
        </button>
        <div className="logo-mark">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="1" width="18" height="18" stroke="var(--ink)" strokeWidth="1.5"/>
            <path d="M5 10 L10 5 L15 10 L10 15 Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
          </svg>
          HireGraph
        </div>
        <button onClick={() => navigate('/setup')} className="btn btn-primary btn-sm">
          + New Session
        </button>
      </header>

      {/* Title strip */}
      <div style={{ borderBottom: '1px solid var(--rule)', padding: '2.5rem 3rem', background: 'var(--surface)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="t-subheading" style={{ marginBottom: '0.75rem' }}>Session History</div>
          <h1 className="t-heading" style={{ marginBottom: '0.5rem' }}>Past Interviews</h1>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.8125rem', color: 'var(--muted)' }}>
            Review archived evaluations and AI analysis.
          </p>
        </div>
      </div>

      {/* Content */}
      <main style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          {loading ? (
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }} className="blinking">
              Loading archive...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ border: '1px solid var(--rule)', padding: '3rem', textAlign: 'center', background: 'var(--surface)' }}>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                No sessions found in the archive.
              </div>
              <button onClick={() => navigate('/setup')} className="btn btn-primary">
                Start First Session
              </button>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 80px 100px',
                gap: '1rem',
                padding: '0.5rem 1rem',
                borderBottom: '2px solid var(--ink)',
                fontFamily: 'IBM Plex Mono',
                fontSize: '0.5625rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}>
                <div>Topic</div>
                <div>Date</div>
                <div style={{ textAlign: 'center' }}>Score</div>
                <div style={{ textAlign: 'right' }}>Status</div>
              </div>

              {/* Session rows */}
              <div style={{ border: '1px solid var(--rule)', borderTop: 'none' }}>
                {sessions.map((session, idx) => {
                  const isCompleted = session.status === 'completed';
                  const score = session.avg_score || session.final_score;
                  const scoreColor = !score ? 'var(--muted)' : score >= 80 ? 'var(--ink)' : score >= 50 ? '#8C6820' : 'var(--accent)';

                  return (
                    <div
                      key={session.id}
                      onClick={() => isCompleted && navigate(`/scorecard/${session.id}`)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px 80px 100px',
                        gap: '1rem',
                        padding: '1rem',
                        borderBottom: idx < sessions.length - 1 ? '1px solid var(--rule)' : 'none',
                        background: 'var(--paper)',
                        cursor: isCompleted ? 'pointer' : 'default',
                        opacity: isCompleted ? 1 : 0.5,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (isCompleted) e.currentTarget.style.background = 'var(--surface)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--paper)'; }}
                    >
                      {/* Topic */}
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 500, fontSize: '0.9375rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                          {session.topic || 'Unknown Topic'}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: 'var(--muted)' }}>
                          ID: {session.id?.toString().substring(0, 8) || 'N/A'}
                          {session.questions_answered ? ` · ${session.questions_answered} question${Number(session.questions_answered) === 1 ? '' : 's'}` : ''}
                        </div>
                      </div>

                      {/* Date */}
                      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--muted)', alignSelf: 'center' }}>
                        {session.start_time
                          ? new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Unknown'}
                      </div>

                      {/* Score */}
                      <div style={{ alignSelf: 'center', textAlign: 'center' }}>
                        {isCompleted && score !== null && score !== undefined ? (
                          <>
                            <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: '1rem', color: scoreColor }}>
                              {score}
                            </div>
                            <ScoreBar score={score} />
                          </>
                        ) : (
                          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--muted)' }}>—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div style={{ alignSelf: 'center', textAlign: 'right' }}>
                        {isCompleted ? (
                          <span className="badge badge-pass">
                            Completed →
                          </span>
                        ) : (
                          <span className="badge badge-neutral">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1rem', fontFamily: 'IBM Plex Mono', fontSize: '0.625rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
