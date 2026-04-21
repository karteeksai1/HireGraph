import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Constellation from '../components/Constellation';

export default function Scorecard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002'}/api/sessions/details/${sessionId}`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to load scorecard");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center font-sans">
        <Constellation />
        <div className="relative z-10 text-[#8B949E] text-sm animate-pulse font-light">Loading Evaluation Data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center font-sans">
        <Constellation />
        <div className="relative z-10 text-center">
          <div className="text-[#f85149] mb-4 text-sm font-medium">Data Corrupted or Missing</div>
          <button onClick={() => navigate('/past-interviews')} className="text-sm text-[#9BA3AF] hover:text-[#E6EDF3] border border-[#30363d] px-4 py-2 rounded-md transition-colors bg-[#21262d]">
            Return to Archive
          </button>
        </div>
      </div>
    );
  }

  const finalAiMessage = [...data.messages].reverse().find(msg => msg.sender_type === 'AI');
  let parsedContent = { feedback: "No specific feedback recorded for this session.", metrics: {} };
  
  if (finalAiMessage && finalAiMessage.message_content) {
    try {
      parsedContent = JSON.parse(finalAiMessage.message_content);
    } catch (e) {
      parsedContent.feedback = finalAiMessage.message_content; 
    }
  }

  const metrics = parsedContent.metrics || {};
  const finalScore = data.session.final_score || 0;

  return (
    <div className="min-h-screen bg-[#0d1117] font-sans flex flex-col relative overflow-hidden">
      <Constellation />
      
      <div className="relative z-10 flex-1 flex flex-col max-w-4xl mx-auto w-full p-8">
        <header className="flex justify-between items-center mb-10 border-b border-[#30363d] pb-6">
          <button onClick={() => navigate('/past-interviews')} className="text-sm text-[#9BA3AF] hover:text-[#E6EDF3] transition-colors">
            ← Back to Archive
          </button>
          <div className="text-sm font-medium text-[#8B949E]">Evaluation Report</div>
        </header>
        
        <div className="bg-[#161b22] rounded-xl p-8 border border-[#30363d] shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#30363d] pb-8">
            <div>
              <div className="text-xs text-[#8B949E] mb-1 font-medium">Challenge Domain</div>
              <h1 className="text-2xl font-semibold text-[#E6EDF3] mb-1">{data.session.topic}</h1>
              <p className="text-[#8B949E] text-xs">
                {new Date(data.session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="mt-6 md:mt-0 text-right">
              <div className="text-xs text-[#8B949E] mb-1 font-medium">Final Assessment</div>
              <div className={`text-5xl font-semibold ${finalScore >= 80 ? 'text-[#3fb950]' : finalScore >= 50 ? 'text-[#d29922]' : 'text-[#f85149]'}`}>
                {finalScore}<span className="text-lg text-[#8B949E]">/100</span>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-md mb-8 text-sm font-medium border ${
            finalScore >= 80 ? 'bg-[#2ea043]/10 text-[#3fb950] border-[#2ea043]/30' : 
            finalScore >= 50 ? 'bg-[#d29922]/10 text-[#d29922] border-[#d29922]/30' : 
            'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30'
          }`}>
            {finalScore >= 80 ? 'Optimal constraints achieved. Code is production ready.' : 
             finalScore >= 50 ? 'Logic functional. Sub-optimal resource consumption detected.' : 
             'Critical inefficiencies. Review metrics for architectural failure points.'}
          </div>

          <h2 className="text-xs text-[#8B949E] font-medium mb-3">Performance Telemetry</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Time Complexity</div>
              <div className="font-mono text-base text-[#D1D5DB]">{metrics.time_complexity || 'N/A'}</div>
            </div>
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Space Complexity</div>
              <div className="font-mono text-base text-[#D1D5DB]">{metrics.space_complexity || 'N/A'}</div>
            </div>
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Code Quality</div>
              <div className="font-medium text-base text-[#D1D5DB]">{metrics.code_quality || 'N/A'}</div>
            </div>
          </div>

          <h2 className="text-xs text-[#8B949E] font-medium mb-3">System Analysis</h2>
          <div className="bg-[#0d1117] p-6 rounded-lg border border-[#30363d] text-[#9BA3AF] leading-relaxed text-sm font-light whitespace-pre-wrap">
            {parsedContent.feedback}
          </div>
        </div>
      </div>
    </div>
  );
}