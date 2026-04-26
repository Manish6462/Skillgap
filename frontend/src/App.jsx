import React, { useState, useRef, useEffect } from 'react';
import { api } from './api';
import GapReport from './components/GapReport';
import LearningPlan from './components/LearningPlan';
import VoiceInterview from './components/VoiceInterview';

const STEPS = ['input', 'analyzing', 'gaps', 'assessing', 'plan'];

export default function App() {
  const [step, setStep] = useState('input');
  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [activeSkill, setActiveSkill] = useState(null);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [learningPlan, setLearningPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [interviewMode, setInterviewMode] = useState('text'); // 'text' | 'voice'
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResumeFileName(file.name);
    setLoading(true);
    try {
      const text = await api.uploadPDF(file);
      setResumeText(text);
    } catch {
      setError('PDF extraction failed — try pasting the resume text instead.');
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!jdText.trim() || !resumeText.trim()) {
      setError('Please provide both a job description and resume.');
      return;
    }
    setError('');
    setStep('analyzing');
    try {
      const data = await api.analyze(jdText, resumeText);
      setSession(data);
      setStep('gaps');
    } catch (e) {
      setError('Analysis failed — check your API key and try again.');
      setStep('input');
    }
  };

  const handleStartAssessment = async (skill) => {
    setStep('assessing');
    setActiveSkill(skill);
    setMessages([]);
    setLoading(true);
    try {
      const data = await api.startAssessment(session.session_id, skill);
      setMessages([{ role: 'assistant', content: data.question }]);
    } catch {
      setError('Failed to start assessment.');
      setStep('gaps');
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!userInput.trim() || loading) return;
    const msg = userInput.trim();
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const data = await api.chat(session.session_id, msg);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.is_complete) {
        // Update local session assessments
        setSession(prev => ({
          ...prev,
          assessments: { ...(prev.assessments || {}), [activeSkill]: data.assessment_data }
        }));

        // Check if more skills to assess
        const remaining = session.skills_to_assess?.filter(
          s => s !== activeSkill && !(session.assessments?.[s])
        );
        if (remaining?.length > 0) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: `Assessment complete for ${activeSkill}. You can assess more skills or generate your learning plan.`
          }]);
          setStep('gaps');
        } else {
          setAssessmentDone(true);
          setMessages(prev => [...prev, {
            role: 'system',
            content: 'All assessments complete! Generating your personalized learning plan...'
          }]);
          handleGeneratePlan();
        }
      }
    } catch {
      setError('Chat error — please try again.');
    }
    setLoading(false);
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const plan = await api.generatePlan(session.session_id);
      setLearningPlan(plan);
      setStep('plan');
    } catch {
      setError('Plan generation failed — try again.');
    }
    setLoading(false);
  };

  const sidebarWidth = step === 'assessing' || step === 'gaps' || step === 'plan' ? 320 : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px', borderBottom: '0.5px solid #e0ddd8',
        background: '#fff', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: '#534AB7', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600
        }}>S</div>
        <div>
          <span style={{ fontWeight: 500, fontSize: 15 }}>SkillGap AI</span>
          <span style={{ fontSize: 12, color: '#888', marginLeft: 10 }}>
            Conversational skill assessment & learning plans
          </span>
        </div>
        {step !== 'input' && (
          <button
            onClick={() => { setStep('input'); setSession(null); setMessages([]); setLearningPlan(null); setActiveSkill(null); }}
            style={{ marginLeft: 'auto', fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Start over
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex' }}>
        {/* Main content */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>

          {/* Step: INPUT */}
          {step === 'input' && (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>
                  Bridge the gap between resume and reality
                </div>
                <div style={{ color: '#666', fontSize: 14 }}>
                  Paste a job description and resume, then let the AI conduct an interactive assessment and build a personalized learning plan.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  Job description
                </label>
                <textarea
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  style={{
                    width: '100%', height: 160, padding: '10px 12px', fontSize: 13,
                    border: '0.5px solid #d0cdc8', borderRadius: 8, resize: 'vertical',
                    background: '#fff', outline: 'none', lineHeight: 1.6,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  Resume
                </label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <label style={{
                    padding: '7px 14px', borderRadius: 7, border: '0.5px solid #d0cdc8',
                    fontSize: 13, cursor: 'pointer', background: '#fafaf9', color: '#555'
                  }}>
                    {resumeFileName || 'Upload PDF'}
                    <input type="file" accept=".pdf" onChange={handlePDFUpload} style={{ display: 'none' }} />
                  </label>
                  <span style={{ fontSize: 12, color: '#aaa', alignSelf: 'center' }}>or paste below</span>
                </div>
                <textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="Paste resume text here..."
                  style={{
                    width: '100%', height: 200, padding: '10px 12px', fontSize: 13,
                    border: '0.5px solid #d0cdc8', borderRadius: 8, resize: 'vertical',
                    background: '#fff', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit',
                  }}
                />
              </div>

              {error && <div style={{ color: '#d85a30', fontSize: 13, marginBottom: 12 }}>{error}</div>}

              <button
                onClick={handleAnalyze}
                disabled={loading || !jdText.trim() || !resumeText.trim()}
                style={{
                  padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                  background: '#534AB7', color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: loading || !jdText.trim() || !resumeText.trim() ? 0.5 : 1,
                }}
              >
                Analyze skills →
              </button>
            </div>
          )}

          {/* Step: ANALYZING */}
          {step === 'analyzing' && (
            <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>⚙️</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Analyzing skills...</div>
              <div style={{ fontSize: 13, color: '#888' }}>Parsing resume, extracting JD requirements, computing gaps</div>
              <div style={{ marginTop: 24, height: 3, borderRadius: 2, background: '#eee', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#534AB7', borderRadius: 2, animation: 'slide 1.4s infinite ease-in-out', width: '40%' }} />
              </div>
              <style>{`@keyframes slide { 0%{margin-left:0%} 50%{margin-left:60%} 100%{margin-left:0%} }`}</style>
            </div>
          )}

          {/* Step: GAPS — show gap list + start assessment CTA */}
          {step === 'gaps' && session && (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>
                  {session.candidate?.name || 'Candidate'} — {session.jd?.role_title}
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  {session.candidate?.years_experience} years experience · {session.gaps?.filter(g => g.severity === 'critical').length} critical gaps
                </div>
              </div>

              {error && <div style={{ color: '#d85a30', fontSize: 13, marginBottom: 12 }}>{error}</div>}

              <div style={{ marginBottom: 16 }}>
                {session.skills_to_assess?.length > 0 ? (
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: '#f5f4ff', fontSize: 13, color: '#534AB7', marginBottom: 16 }}>
                    Click "Assess this skill" on any gap below to start an interactive assessment, then generate your learning plan.
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: '#eaf3de', fontSize: 13, color: '#1e4a08', marginBottom: 16 }}>
                    No critical gaps found — candidate looks like a strong fit!
                  </div>
                )}

                <GapReport
                  gaps={session.gaps}
                  assessments={session.assessments}
                  skillsToAssess={session.skills_to_assess}
                  onStartAssessment={handleStartAssessment}
                  activeSkill={activeSkill}
                />
              </div>

              <button
                onClick={handleGeneratePlan}
                disabled={loading}
                style={{
                  padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: loading ? '#ddd' : '#0F6E56', color: '#fff', border: 'none', cursor: 'pointer'
                }}
              >
                {loading ? 'Generating...' : 'Generate learning plan →'}
              </button>
            </div>
          )}

          {/* Step: ASSESSING — voice or text interface */}
          {step === 'assessing' && (
            <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>

              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Interview mode:</div>
                <button
                  onClick={() => setInterviewMode('voice')}
                  style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: interviewMode === 'voice' ? '#534AB7' : 'transparent',
                    color: interviewMode === 'voice' ? '#fff' : '#534AB7',
                    border: '1px solid #534AB7', cursor: 'pointer',
                  }}
                >
                  🎙️ Voice
                </button>
                <button
                  onClick={() => setInterviewMode('text')}
                  style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: interviewMode === 'text' ? '#534AB7' : 'transparent',
                    color: interviewMode === 'text' ? '#fff' : '#534AB7',
                    border: '1px solid #534AB7', cursor: 'pointer',
                  }}
                >
                  💬 Text
                </button>
              </div>

              {/* Voice mode */}
              {interviewMode === 'voice' && (
                <VoiceInterview
                  sessionId={session?.session_id}
                  skill={activeSkill}
                  apiChat={api.chat}
                  apiStartAssessment={api.startAssessment}
                  onComplete={(assessmentData) => {
                    setSession(prev => ({
                      ...prev,
                      assessments: { ...(prev.assessments || {}), [activeSkill]: assessmentData }
                    }));
                    setStep('gaps');
                  }}
                  onBack={() => setInterviewMode('text')}
                />
              )}

              {/* Text mode */}
              {interviewMode === 'text' && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#f5f4ff', fontSize: 13 }}>
                Assessing: <strong style={{ color: '#534AB7' }}>{activeSkill}</strong>
                <span style={{ color: '#888', marginLeft: 8 }}>— answer 3 questions, then the AI scores your proficiency</span>
              </div>}

              {interviewMode === 'text' && <>
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    marginBottom: 12,
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    {msg.role === 'system' ? (
                      <div style={{ fontSize: 12, color: '#aaa', width: '100%', textAlign: 'center', padding: '4px 0' }}>
                        {msg.content}
                      </div>
                    ) : (
                      <div style={{
                        maxWidth: '85%', padding: '10px 14px', borderRadius: 10, fontSize: 14, lineHeight: 1.6,
                        background: msg.role === 'user' ? '#534AB7' : '#fff',
                        color: msg.role === 'user' ? '#fff' : '#1a1a1a',
                        border: msg.role === 'user' ? 'none' : '0.5px solid #e0ddd8',
                      }}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', gap: 4, padding: '8px 14px' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: '#ccc',
                        animation: `bounce 1s infinite ${i * 0.2}s`
                      }} />
                    ))}
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {error && <div style={{ color: '#d85a30', fontSize: 12, marginBottom: 8 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type your answer..."
                  disabled={loading || assessmentDone}
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: 14, borderRadius: 8,
                    border: '0.5px solid #d0cdc8', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !userInput.trim() || assessmentDone}
                  style={{
                    padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                    background: '#534AB7', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: loading || !userInput.trim() ? 0.5 : 1,
                  }}
                >
                  Send
                </button>
              </div>
              <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
              </>}
            </div>
          )}

          {/* Step: PLAN */}
          {step === 'plan' && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <LearningPlan plan={learningPlan} />
            </div>
          )}
        </div>

        {/* Sidebar — gap report always visible during assessment/gaps/plan */}
        {sidebarWidth > 0 && step !== 'gaps' && (
          <div style={{
            width: sidebarWidth, padding: 20, borderLeft: '0.5px solid #e0ddd8',
            background: '#fafaf9', overflowY: 'auto', flexShrink: 0,
          }}>
            <GapReport
              gaps={session?.gaps}
              assessments={session?.assessments}
              skillsToAssess={session?.skills_to_assess}
              onStartAssessment={handleStartAssessment}
              activeSkill={activeSkill}
            />

            {step === 'assessing' && (
              <button
                onClick={() => setStep('gaps')}
                style={{
                  marginTop: 12, width: '100%', padding: '8px', borderRadius: 7,
                  border: '0.5px solid #e0ddd8', background: '#fff', fontSize: 12,
                  color: '#555', cursor: 'pointer'
                }}
              >
                ← Back to all gaps
              </button>
            )}

            {step !== 'plan' && (
              <button
                onClick={handleGeneratePlan}
                disabled={loading}
                style={{
                  marginTop: 8, width: '100%', padding: '8px', borderRadius: 7,
                  background: '#0F6E56', color: '#fff', border: 'none', fontSize: 12,
                  cursor: 'pointer', fontWeight: 500
                }}
              >
                Generate learning plan →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
