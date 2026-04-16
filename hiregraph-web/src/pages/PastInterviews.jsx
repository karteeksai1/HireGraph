import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PastInterviews() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hiregraph_user'));
    if (user && user.id) {
      setUserId(user.id);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!userId) return;
      try {
        const response = await axios.get(`http://localhost:5001/api/sessions/${userId}`);
        setSessions(response.data);
      } catch (error) {
        console.error('Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Navbar */}
      <div className="border-b border-gray-800 px-8 py-5 flex justify-between items-center max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Back to Home
        </button>
        <button
          onClick={() => navigate('/interview')}
          className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded font-bold text-sm transition-colors"
        >
          + Start New Interview
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-bold mb-2">Past Interviews</h1>
        <p className="text-gray-400 mb-10">Click any session to view the full scorecard and AI feedback.</p>

        {loading ? (
          <div className="text-gray-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-12 text-center">
            <p className="text-gray-400 text-lg mb-4">No interviews yet.</p>
            <button
              onClick={() => navigate('/interview')}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold transition-colors"
            >
              Start Your First Interview
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => navigate(`/scorecard/${session.id}`)}
                className="bg-[#1e293b] p-6 rounded-xl border border-gray-700 flex flex-col justify-between cursor-pointer hover:border-blue-500 transition-colors"
              >
                <h3 className="text-xl font-bold text-blue-400 mb-4">{session.topic}</h3>
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>
                    {new Date(session.start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {session.status === 'completed' ? (
                    <span className={`font-bold ${session.final_score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                      Score: {session.final_score}/100
                    </span>
                  ) : (
                    <span className="text-yellow-400 font-bold">In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}