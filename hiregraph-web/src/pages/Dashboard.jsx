import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const pastInterviews = [
    { id: 1, topic: 'Linked Lists', score: 'Pass', date: '2026-04-06' },
    { id: 2, topic: 'Arrays', score: 'Fail', date: '2026-04-02' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-gray-700 pb-6">
          <h1 className="text-4xl font-bold">Welcome back, Karteek</h1>
          <button 
            onClick={() => navigate('/interview')}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-all"
          >
            + Start New Interview
          </button>
        </div>
        
        <h2 className="text-2xl text-gray-400 mb-6">Past Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pastInterviews.map((session) => (
            <div key={session.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-gray-500 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-blue-400 mb-4">{session.topic}</h3>
              <div className="flex justify-between text-sm text-gray-400">
                <span>{session.date}</span>
                <span className={session.score === 'Pass' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {session.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}