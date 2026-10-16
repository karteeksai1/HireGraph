import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? 'var(--ink)' : pct >= 50 ? '#8C6820' : 'var(--accent)';
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ height: '3px', background: 'var(--rule)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function Scorecard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/sessions/details/${sessionId}`
        );
        setData(res.data);
      } catch {
        console.error('Failed to load scorecard');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="page-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }} className="blinking">
          Loading Evaluation...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="t-subheading" style={{ color: 'var(--accent)', marginBottom: '1rem' }}>
            Data Not Found
          </div>
          <button onClick={() => navigate('/past-interviews')} className="btn btn-ghost">
            ← Return to Archive
          </button>
        </div>
      </div>
    );
  }

  const stats = data.stats || {};
  const evaluations = stats.evaluations || [];
  const lastEval = stats.lastEvaluation || evaluations[evaluations.length - 1] || {};
  const finalScore = stats.avgScore || data.session.final_score || 0;
  const questions = data.messages
    .map(msg => {
      try {
        const parsed = JSON.parse(msg.message_content);
        return parsed?.type === 'question' ? parsed : null;
      } catch { return null; }
    })
    .filter(Boolean);
  const latestQ = questions[questions.length - 1] || {};
  const metrics = {
    ...(lastEval.metrics || {}),
    time_complexity: lastEval.metrics?.time_complexity || latestQ.optimal_time || 'N/A',
    space_complexity: lastEval.metrics?.space_complexity || latestQ.optimal_space || 'N/A',
  };

  const verdict =
    finalScore >= 80 ? 'Optimal. Code is production-ready.'
    : finalScore >= 50 ? 'Functional. Sub-optimal resource use detected.'
    : 'Critical inefficiencies. Review metrics for failure points.';

  const verdictColor = finalScore >= 80 ? 'var(--ink)' : finalScore >= 50 ? '#8C6820' : 'var(--accent)';

  const sessionDate = new Date(data.session.start_time).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="page-shell">
      {/* Header */}
      <header className="site-header">
        <button onClick={() => navigate('/past-interviews')} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M11 7H3M7 3L3 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
          Archive
        </button>
        <div className="logo-mark">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="1" width="18" height="18" stroke="var(--ink)" strokeWidth="1.5"/>
            <path d="M5 10 L10 5 L15 10 L10 15 Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
          </svg>
          HireGraph
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Evaluation Report
        </div>
      </header>

      <main style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* Report header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', borderBottom: '1px solid var(--rule)', paddingBottom: '2rem' }}>
            <div>
              <div className="t-subheading" style={{ marginBottom: '0.75rem' }}>Evaluation Report</div>
              <h1 className="t-heading" style={{ marginBottom: '0.375rem' }}>
                {questions.length} Question{questions.length !== 1 ? 's' : ''} — Session
              </h1>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--muted)' }}>
                {sessionDate}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="t-subheading" style={{ marginBottom: '0.375rem' }}>Average Score</div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: '3.5rem', lineHeight: 1, color: verdictColor }}>
                {finalScore}
                <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 400 }}>/100</span>
              </div>
              <ScoreBar score={finalScore} />
            </div>
          </div>

          {/* Verdict */}
          <div style={{
            borderLeft: `3px solid ${verdictColor}`,
            padding: '0.875rem 1rem',
            background: 'var(--surface)',
            marginBottom: '2.5rem',
            fontFamily: 'IBM Plex Mono',
            fontSize: '0.8125rem',
            color: verdictColor,
          }}>
            {verdict}
          </div>

          {/* Performance metrics */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="t-subheading" style={{ marginBottom: '1rem' }}>Performance Telemetry</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', border: '1px solid var(--rule)' }}>
              {[
                { label: 'Avg Score', value: `${finalScore}/100` },
                { label: 'Raw Average', value: `${stats.avgRawScore || 0}/100` },
                { label: 'Questions', value: stats.questionsAnswered || evaluations.length || 0 },
                { label: 'Penalty', value: `-${stats.totalPenalty || 0}` },
                { label: 'Time Complexity', value: metrics.time_complexity },
                { label: 'Space Complexity', value: metrics.space_complexity },
              ].map(m => (
                <div key={m.label} className="metric-cell" style={{ borderRight: '1px solid var(--rule)' }}>
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value">{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Question breakdown */}
          {questions.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div className="t-subheading" style={{ marginBottom: '1rem' }}>Question Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--rule)' }}>
                {questions.map((question, index) => {
                  const evaluation = evaluations[index] || {};
                  const qScore = evaluation.adjustedScore ?? evaluation.score ?? null;
                  const qColor = qScore === null ? 'var(--muted)' : qScore >= 80 ? 'var(--ink)' : qScore >= 50 ? '#8C6820' : 'var(--accent)';
                  return (
                    <div key={`${question.title}-${index}`} style={{
                      padding: '1.25rem 1.5rem',
                      borderBottom: index < questions.length - 1 ? '1px solid var(--rule)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--accent)' }}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 500, fontSize: '0.9375rem', color: 'var(--ink)' }}>
                            {question.title}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.875rem', fontWeight: 600, color: qColor, flexShrink: 0, marginLeft: '1rem' }}>
                          {qScore !== null ? `${qScore}/100` : '—'}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                        {question.text}
                      </div>
                      {qScore !== null && <ScoreBar score={qScore} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div>
            <div className="t-subheading" style={{ marginBottom: '1rem' }}>AI Analysis</div>
            <div style={{
              border: '1px solid var(--rule)',
              padding: '1.5rem',
              fontFamily: 'IBM Plex Mono',
              fontSize: '0.8125rem',
              color: 'var(--ink)',
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              background: 'var(--surface)',
            }}>
              {lastEval.feedback || 'No feedback recorded for this session.'}
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--rule)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => navigate('/past-interviews')} className="btn btn-ghost">
              ← Archive
            </button>
            <button onClick={() => navigate('/setup')} className="btn btn-primary">
              New Session
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
