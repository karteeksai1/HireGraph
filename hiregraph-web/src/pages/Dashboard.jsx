import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hiregraph_user'));
    if (user && user.name) {
      setUserName(user.name);
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
        console.error("Failed to load sessions");
      }
    };
    fetchSessions();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-12 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold">Welcome back, {userName}</h1>
          <button 
            onClick={() => navigate('/interview')}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold transition-colors"
          >
            + Start New Interview
          </button>
        </div>

        <h2 className="text-xl text-gray-400 mb-6">Past Sessions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => navigate(`/scorecard/${session.id}`)}
              className="bg-[#1e293b] p-6 rounded-lg border border-gray-700 flex flex-col justify-between cursor-pointer hover:border-blue-500 transition-colors"
            >
              <h3 className="text-xl font-bold text-blue-400 mb-4">{session.topic}</h3>
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>
                  {new Date(session.start_time).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
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
          {sessions.length === 0 && (
            <div className="text-gray-500">No past sessions found. Start an interview!</div>
          )}
        </div>
      </div>
    </div>
  );
}