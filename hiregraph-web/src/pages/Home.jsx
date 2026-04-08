import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
      <h1 className="text-6xl font-bold text-blue-500 mb-6">HireGraph AI</h1>
      <p className="text-xl text-gray-400 mb-10 max-w-2xl text-center">
        The world's most advanced AI coding interviewer. Practice DSA, System Design, and Web Development with a strict FAANG-level agent.
      </p>
      <button 
        onClick={() => navigate('/dashboard')}
        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-bold transition-all"
      >
        Enter Dashboard
      </button>
    </div>
  );
}