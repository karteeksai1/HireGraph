import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Scorecard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/sessions/details/${sessionId}`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to load scorecard");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [sessionId]);

  if (loading) return <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">Loading Analytics...</div>;
  if (!data) return <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">Scorecard Not Found</div>;

  // Safely extract the AI message and unbox the JSON string
  const finalAiMessage = [...data.messages].reverse().find(msg => msg.sender_type === 'AI');
  let parsedContent = { feedback: "No feedback recorded for this session.", metrics: {} };
  
  if (finalAiMessage && finalAiMessage.message_content) {
    try {
      parsedContent = JSON.parse(finalAiMessage.message_content);
    } catch (e) {
      parsedContent.feedback = finalAiMessage.message_content; // Fallback for older plain-text messages
    }
  }

  const metrics = parsedContent.metrics || {};
  const finalScore = data.session.final_score || 0;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white mb-8 transition-colors">
          ← Back to Dashboard
        </button>
        
        <div className="bg-[#1e293b] rounded-xl p-8 border border-gray-700 mb-8 shadow-lg">
          <div className="flex justify-between items-start mb-6 border-b border-gray-700 pb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{data.session.topic}</h1>
              <p className="text-gray-400">
                Completed on {new Date(data.session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Final Score</div>
              <div className={`text-5xl font-bold ${finalScore >= 80 ? 'text-green-400' : finalScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {finalScore}/100
              </div>
            </div>
          </div>

          {/* DYNAMIC FEEDBACK BANNER */}
          <div className={`p-4 rounded-lg mb-8 font-bold border ${
            finalScore >= 80 ? 'bg-green-900/30 text-green-400 border-green-700' : 
            finalScore >= 50 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700' : 
            'bg-red-900/30 text-red-400 border-red-700'
          }`}>
            {finalScore >= 80 ? '🎉 Outstanding! Your code is highly optimized and interview-ready.' : 
             finalScore >= 50 ? '👍 Good effort! Your logic works, but there is room for optimization.' : 
             '💪 Keep practicing! Review the feedback below to improve your complexities.'}
          </div>

          <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Time Complexity</div>
              <div className="font-mono text-lg text-blue-400">{metrics.time_complexity || 'N/A'}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Space Complexity</div>
              <div className="font-mono text-lg text-blue-400">{metrics.space_complexity || 'N/A'}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Code Quality</div>
              <div className="font-bold text-lg text-purple-400">{metrics.code_quality || 'N/A'}</div>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">Final AI Feedback</h2>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-gray-300 leading-relaxed whitespace-pre-wrap">
            {parsedContent.feedback}
          </div>
        </div>
      </div>
    </div>
  );
}