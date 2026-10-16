import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Inline SVG icons — no emoji, no icon font
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M9 5V9.5L12 11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square"/>
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="1.5" width="15" height="15" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M7 5.5L13 9L7 12.5V5.5Z" fill="currentColor"/>
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('hiregraph_user') || '{}');
  const firstName = storedUser.name ? storedUser.name.split(' ')[0] : 'Engineer';

  useEffect(() => {
    if (!storedUser.name) navigate('/login');
  }, [navigate, storedUser.name]);

  const cards = [
    {
      id: 'history',
      label: '01',
      title: 'Session Archive',
      desc: 'Review past evaluations, AI feedback, and per-question score breakdowns.',
      icon: <IconHistory />,
      action: () => navigate('/past-interviews'),
    },
    {
      id: 'new',
      label: '02',
      title: 'New Session',
      desc: 'Select a domain and difficulty. A question is loaded instantly.',
      icon: <IconPlay />,
      action: () => navigate('/setup'),
    },
  ];

  return (
    <div className="page-shell">
      {/* Header */}
      <header className="site-header">
        <div className="logo-mark">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="1" width="18" height="18" stroke="var(--ink)" strokeWidth="1.5"/>
            <path d="M5 10 L10 5 L15 10 L10 15 Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
          </svg>
          HireGraph
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('hiregraph_user');
            navigate('/login');
          }}
          className="btn btn-ghost btn-sm"
        >
          Sign Out
        </button>
      </header>

      {/* Hero strip */}
      <div
        style={{
          borderBottom: '1px solid var(--rule)',
          padding: '3rem 3rem 2.5rem',
          background: 'var(--surface)',
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="t-subheading" style={{ marginBottom: '0.75rem' }}>
            Dashboard
          </div>
          <h1
            className="t-display"
            style={{ marginBottom: '1rem' }}
          >
            {firstName}
            <span style={{ color: 'var(--accent)', marginLeft: '0.125em' }}>.</span>
          </h1>
          <p className="t-body" style={{ color: 'var(--muted)', maxWidth: '560px' }}>
            AI-powered technical interview practice. Choose a domain, solve a problem, and receive structured evaluation.
          </p>
        </div>
      </div>

      {/* Cards */}
      <main style={{ flex: 1, padding: '2.5rem 3rem' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="t-subheading" style={{ marginBottom: '1.5rem' }}>
            What to do next
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1px', border: '1px solid var(--rule)' }}>
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={card.action}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '1.25rem',
                  padding: '2rem',
                  background: 'var(--paper)',
                  border: 'none',
                  borderRight: '1px solid var(--rule)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--paper)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                    {card.label}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>
                    {card.icon}
                  </span>
                </div>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600, fontSize: '1.1875rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
                    {card.title}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                    {card.desc}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ink)', fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Open <IconArrow />
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--rule)',
        padding: '1rem 3rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: 'var(--muted)' }}>
            HireGraph
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.6875rem', color: 'var(--muted)' }}>
            AI Interview Practice
          </span>
        </div>
      </footer>
    </div>
  );
}
