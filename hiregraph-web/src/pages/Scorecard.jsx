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
      } catch {
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

  const stats = data.stats || {};
  const evaluations = stats.evaluations || [];
  const lastEvaluation = stats.lastEvaluation || evaluations[evaluations.length - 1] || {};
  const finalScore = stats.avgScore || data.session.final_score || 0;
  const questions = data.messages
    .map(msg => {
      try {
        const parsed = JSON.parse(msg.message_content);
        return parsed?.type === 'question' ? parsed : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const latestQuestion = questions[questions.length - 1] || {};
  const metrics = {
    ...(lastEvaluation.metrics || {}),
    time_complexity: lastEvaluation.metrics?.time_complexity || latestQuestion.optimal_time || 'N/A',
    space_complexity: lastEvaluation.metrics?.space_complexity || latestQuestion.optimal_space || 'N/A'
  };

  return (
    <div className="min-h-screen bg-[#0d1117] font-sans flex flex-col relative overflow-hidden">
      <Constellation />
      
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full px-6 py-8">
        <header className="flex justify-between items-center mb-8 border-b border-[#30363d] pb-5">
          <button onClick={() => navigate('/past-interviews')} className="text-sm text-[#9BA3AF] hover:text-[#E6EDF3] transition-colors">
            ← Back to Archive
          </button>
          <div className="text-sm font-medium text-[#8B949E]">Evaluation Report</div>
        </header>
        
        <div className="bg-[#161b22] rounded-xl p-6 md:p-8 border border-[#30363d] shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[#30363d] pb-8">
            <div>
              <div className="text-xs text-[#8B949E] mb-1 font-medium">Interview Summary</div>
              <h1 className="text-2xl font-semibold text-[#E6EDF3] mb-1">
                {questions.length} Question Session
              </h1>
              <p className="text-[#8B949E] text-xs">
                {new Date(data.session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="mt-6 md:mt-0 text-right">
              <div className="text-xs text-[#8B949E] mb-1 font-medium">Average Assessment</div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Latest Time Complexity</div>
              <div className="font-mono text-base text-[#D1D5DB]">{metrics.time_complexity || 'N/A'}</div>
            </div>
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Latest Space Complexity</div>
              <div className="font-mono text-base text-[#D1D5DB]">{metrics.space_complexity || 'N/A'}</div>
            </div>
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Score Adjustment</div>
              <div className="font-medium text-base text-[#D1D5DB]">-{stats.totalPenalty || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Questions Answered</div>
              <div className="font-mono text-base text-[#D1D5DB]">{stats.questionsAnswered || evaluations.length}</div>
            </div>
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Raw Average</div>
              <div className="font-mono text-base text-[#D1D5DB]">{stats.avgRawScore || 0}/100</div>
            </div>
            <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
              <div className="text-xs text-[#8B949E] mb-1">Latest Code Quality</div>
              <div className="font-medium text-base text-[#D1D5DB]">{metrics.code_quality || 'N/A'}</div>
            </div>
          </div>

          <h2 className="text-xs text-[#8B949E] font-medium mb-3">Question Breakdown</h2>
          <div className="space-y-3 mb-8">
            {questions.map((question, index) => {
              const evaluation = evaluations[index] || {};
              return (
                <div key={`${question.title}-${index}`} className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-medium text-[#D1D5DB]">{index + 1}. {question.title}</div>
                    <div className="text-xs font-mono text-[#8B949E]">
                      {evaluation.adjustedScore ?? evaluation.score ?? 'N/A'}/100
                    </div>
                  </div>
                  <div className="text-xs text-[#8B949E] leading-relaxed">{question.text}</div>
                </div>
              );
            })}
          </div>

          <h2 className="text-xs text-[#8B949E] font-medium mb-3">Latest System Analysis</h2>
          <div className="bg-[#0d1117] p-6 rounded-lg border border-[#30363d] text-[#9BA3AF] leading-relaxed text-sm font-light whitespace-pre-wrap">
            {lastEvaluation.feedback || "No specific feedback recorded for this session."}
          </div>
        </div>
      </div>
    </div>
  );
}
