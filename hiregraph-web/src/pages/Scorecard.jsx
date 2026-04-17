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
        const response = await axios.get(`http://localhost:5002/api/sessions/details/${sessionId}`);
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
      <div className="min-h-screen bg-[#030000] flex items-center justify-center font-sans tracking-[0.2em] uppercase text-red-400 text-sm">
        <Constellation />
        <div className="relative z-10 animate-pulse">Decrypting Evaluation Data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#030000] text-white flex flex-col items-center justify-center font-sans">
        <Constellation />
        <div className="relative z-10 text-center">
          <div className="text-red-500 mb-4 tracking-[0.2em] uppercase">Data Corrupted or Missing</div>
          <button onClick={() => navigate('/past-interviews')} className="text-xs text-orange-400 hover:text-white border border-orange-900/50 px-6 py-2 rounded uppercase tracking-widest transition-colors">
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
    <div className="min-h-screen bg-[#030000] text-white font-sans flex flex-col relative overflow-hidden">
      <div className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[150%] h-[80%] bg-red-950/80 blur-[120px] rounded-[100%] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-full h-[50%] bg-red-800/40 blur-[100px] rounded-[100%] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-orange-500/80 to-transparent pointer-events-none shadow-[0_0_20px_rgba(249,115,22,1)] z-0"></div>
      
      <Constellation />
      
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full p-8">
        <header className="flex justify-between items-center mb-10 border-b border-red-900/30 pb-6">
          <button onClick={() => navigate('/past-interviews')} className="text-[10px] tracking-[0.3em] text-red-200/50 hover:text-white transition-colors uppercase">
            ← Back to Archive
          </button>
          <div className="text-xs font-light tracking-[0.4em] text-red-200/80 uppercase">Evaluation Report</div>
        </header>
        
        <div className="bg-black/60 backdrop-blur-xl rounded-sm p-10 border border-red-900/30 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-red-900/30 pb-10">
            <div>
              <div className="text-[10px] tracking-[0.4em] text-orange-500/70 mb-2 uppercase">Target Acquired</div>
              <h1 className="text-3xl md:text-4xl font-light text-white tracking-widest uppercase mb-2">{data.session.topic}</h1>
              <p className="text-red-200/40 text-xs tracking-[0.15em] uppercase">
                Temporal Marker: {new Date(data.session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="mt-6 md:mt-0 text-right">
              <div className="text-[10px] tracking-[0.4em] text-red-200/50 mb-2 uppercase">Final Assessment</div>
              <div className={`text-6xl font-light tracking-tighter ${finalScore >= 80 ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]' : finalScore >= 50 ? 'text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.3)]' : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
                {finalScore}<span className="text-2xl text-red-200/30">/100</span>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-sm mb-10 font-light text-sm tracking-widest uppercase border ${
            finalScore >= 80 ? 'bg-green-950/20 text-green-300 border-green-900/50' : 
            finalScore >= 50 ? 'bg-orange-950/20 text-orange-300 border-orange-900/50' : 
            'bg-red-950/20 text-red-300 border-red-900/50'
          }`}>
            {finalScore >= 80 ? 'Optimal constraints achieved. Code is production ready.' : 
             finalScore >= 50 ? 'Logic functional. Sub-optimal resource consumption detected.' : 
             'Critical inefficiencies. Review metrics for architectural failure points.'}
          </div>

          <h2 className="text-[10px] tracking-[0.4em] text-red-200/50 mb-4 uppercase">Performance Telemetry</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-black/40 p-6 border border-red-900/20">
              <div className="text-[10px] tracking-[0.2em] text-orange-500/70 mb-2 uppercase">Time Complexity</div>
              <div className="font-mono text-xl text-white">{metrics.time_complexity || 'N/A'}</div>
            </div>
            <div className="bg-black/40 p-6 border border-red-900/20">
              <div className="text-[10px] tracking-[0.2em] text-orange-500/70 mb-2 uppercase">Space Complexity</div>
              <div className="font-mono text-xl text-white">{metrics.space_complexity || 'N/A'}</div>
            </div>
            <div className="bg-black/40 p-6 border border-red-900/20">
              <div className="text-[10px] tracking-[0.2em] text-orange-500/70 mb-2 uppercase">Code Quality</div>
              <div className="font-light tracking-widest text-xl text-white uppercase">{metrics.code_quality || 'N/A'}</div>
            </div>
          </div>

          <h2 className="text-[10px] tracking-[0.4em] text-red-200/50 mb-4 uppercase">System Analysis</h2>
          <div className="bg-black/40 p-8 border border-red-900/20 text-red-100/70 leading-loose text-sm font-light tracking-wide whitespace-pre-wrap">
            {parsedContent.feedback}
          </div>
        </div>
      </div>
    </div>
  );
}