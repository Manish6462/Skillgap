import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { api } from './api';
import GapReport from './components/GapReport';
import LearningPlan from './components/LearningPlan';
import VoiceInterview from './components/VoiceInterview';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import ErrorState from './components/ErrorState';
import { lightTheme, darkTheme, fonts } from './theme';
import { useAuth } from './AuthContext';
import { saveSession, updateSession } from './db';

export const ThemeContext = createContext(lightTheme);
export const useTheme = () => useContext(ThemeContext);

function textareaStyle(t, height) {
  return { width:'100%', height, padding:'10px 2px', fontSize:13, border:'none', outline:'none', resize:'vertical', background:'transparent', color:t.text, fontFamily:"'DM Sans',sans-serif", lineHeight:1.65 };
}

function InputCard({ t, label, icon, children }) {
  return (
    <div style={{ borderRadius:12, border:`1px solid ${t.border}`, background:t.bgCard, overflow:'hidden', boxShadow:t.shadow }}>
      <div style={{ padding:'10px 16px', borderBottom:`1px solid ${t.border}`, background:t.bgSecondary, display:'flex', alignItems:'center', gap:8 }}>
        <span>{icon}</span>
        <span style={{ fontSize:12, fontWeight:600, color:t.textSecondary, letterSpacing:'0.04em' }}>{label.toUpperCase()}</span>
      </div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

function Chip({ t, color, children }) {
  const colors = {
    purple: { bg:t.purpleLight, text:t.purpleText, border:`${t.purple}30` },
    red:    { bg:t.redLight,    text:t.red,        border:`${t.red}30` },
    green:  { bg:t.greenLight,  text:t.green,      border:`${t.green}30` },
    default:{ bg:t.bgSecondary, text:t.textSecondary, border:t.border },
  };
  const c = colors[color] || colors.default;
  return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:6, fontSize:12, fontWeight:500, background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>{children}</span>;
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const t = isDark ? darkTheme : lightTheme;
  const { user, loading: authLoading } = useAuth();

  const [step, setStep]                 = useState('input');
  const [jdText, setJdText]             = useState('');
  const [resumeText, setResumeText]     = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [session, setSession]           = useState(null);
  const [sessionDbId, setSessionDbId]   = useState(null);
  const [messages, setMessages]         = useState([]);
  const [userInput, setUserInput]       = useState('');
  const [activeSkill, setActiveSkill]   = useState(null);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [learningPlan, setLearningPlan] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [interviewMode, setInterviewMode] = useState('text');
  const [aiMode, setAiMode]             = useState('live');
  const [showProfile, setShowProfile]   = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);
  useEffect(() => {
    document.body.style.background = t.bg;
    document.body.style.color = t.text;
    document.body.style.transition = 'background 0.3s, color 0.3s';
  }, [isDark, t.bg, t.text]);
  useEffect(() => {
    fetch('/api/health').then(r=>r.json()).then(d=>{ if(d.mode==='demo') setAiMode('demo'); }).catch(()=>{});
  }, []);

  // Show login if not authenticated
  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', background:t.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:`3px solid ${t.border}`, borderTopColor:t.purple, animation:'spin 0.9s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return <LoginPage t={t} />;

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResumeFileName(file.name); setLoading(true);
    try { const text = await api.uploadPDF(file); setResumeText(text); }
    catch { setError('PDF extraction failed — try pasting the resume text instead.'); }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!jdText.trim() || !resumeText.trim()) { setError('Please provide both a job description and resume.'); return; }
    setError(''); setStep('analyzing');
    try {
      const data = await api.analyze(jdText, resumeText);
      setSession(data);

      // Save to Supabase
      if (user) {
        const row = await saveSession(user.id, { ...data, jd_text: jdText, resume_text: resumeText });
        if (row) setSessionDbId(row.id);
      }
      setStep('gaps');
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Analysis failed');
      setAiMode('demo'); setStep('input');
    }
  };

  const handleStartAssessment = async (skill) => {
    setStep('assessing'); setActiveSkill(skill); setMessages([]); setAssessmentDone(false); setLoading(true);
    try { const data = await api.startAssessment(session.session_id, skill); setMessages([{ role:'assistant', content:data.question }]); }
    catch { setError('Failed to start assessment.'); setStep('gaps'); }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!userInput.trim() || loading) return;
    const msg = userInput.trim(); setUserInput('');
    setMessages(prev => [...prev, { role:'user', content:msg }]); setLoading(true);
    try {
      const data = await api.chat(session.session_id, msg);
      setMessages(prev => [...prev, { role:'assistant', content:data.reply }]);
      if (data.is_complete) {
        const newAssessments = { ...(session.assessments||{}), [activeSkill]: data.assessment_data };
        setSession(prev => ({ ...prev, assessments: newAssessments }));
        if (sessionDbId) await updateSession(sessionDbId, { assessments: newAssessments });
        const remaining = session.skills_to_assess?.filter(s => s !== activeSkill && !newAssessments[s]);
        if (remaining?.length > 0) { setMessages(prev => [...prev, { role:'system', content:`✓ ${activeSkill} assessed. Assess more or generate your plan.` }]); setStep('gaps'); }
        else { setAssessmentDone(true); handleGeneratePlan(); }
      }
    } catch { setError('Chat error — please try again.'); }
    setLoading(false);
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const plan = await api.generatePlan(session.session_id);
      setLearningPlan(plan); setStep('plan');
      if (sessionDbId) await updateSession(sessionDbId, { learning_plan: plan, time_to_ready_weeks: plan.time_to_ready_weeks });
    } catch (e) { setError(e?.response?.data?.detail || e?.message || 'Plan generation failed'); }
    setLoading(false);
  };

  const handleLoadSession = (s) => {
    setSession({ gaps: s.gaps, assessments: s.assessments, candidate: { name: s.candidate_name }, jd: { role_title: s.role_title }, skills_to_assess: [] });
    setSessionDbId(s.id);
    setLearningPlan(s.learning_plan);
    setJdText(s.jd_text || ''); setResumeText(s.resume_text || '');
    setStep(s.learning_plan ? 'plan' : 'gaps');
  };

  const resetAll = () => {
    setStep('input'); setSession(null); setSessionDbId(null); setMessages([]);
    setLearningPlan(null); setActiveSkill(null); setJdText(''); setResumeText('');
    setResumeFileName(''); setError(''); setAssessmentDone(false);
  };

  const sidebarVisible = (step === 'assessing' || step === 'plan') && session;

  return (
    <ThemeContext.Provider value={t}>
      <div style={{ minHeight:'100vh', background:t.bg, fontFamily:fonts.body, color:t.text, transition:'background 0.3s,color 0.3s' }}>
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
          @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:1}}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
          .fade-up{animation:fadeUp 0.4s ease both}
          .fade-up-1{animation:fadeUp 0.4s 0.06s ease both}
          .fade-up-2{animation:fadeUp 0.4s 0.12s ease both}
          button{font-family:inherit;cursor:pointer}
          textarea,input{font-family:inherit}
          ::-webkit-scrollbar{width:4px}
          ::-webkit-scrollbar-thumb{background:${t.border};border-radius:2px}
        `}</style>

        {/* HEADER */}
        <header style={{ position:'sticky', top:0, zIndex:100, background:t.headerBg, backdropFilter:'blur(14px)', borderBottom:`1px solid ${t.border}`, padding:'0 28px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', transition:'background 0.3s,border-color 0.3s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:t.text, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10L5 4L8 8L10 6L13 10" stroke={t.accentText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily:fonts.display, fontWeight:800, fontSize:16, letterSpacing:'-0.02em' }}>SkillGap<span style={{ color:t.purple }}>AI</span></span>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {step !== 'input' && <button onClick={resetAll} style={{ fontSize:12, color:t.textSecondary, background:'none', border:'none', padding:'4px 10px', borderRadius:6 }}>← Start over</button>}
            {aiMode === 'demo' && <div style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:6, background:'#FEF3C7', color:'#B45309', border:'1px solid #F59E0B40', letterSpacing:'0.04em' }}>DEMO MODE</div>}
            <button onClick={() => setIsDark(!isDark)} title={isDark?'Light mode':'Dark mode'} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${t.border}`, background:t.bgSecondary, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, transition:'all 0.15s' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
            {/* Avatar button */}
            <button onClick={() => setShowProfile(true)} style={{ width:36, height:36, borderRadius:'50%', border:`2px solid ${t.purple}`, padding:0, overflow:'hidden', cursor:'pointer', transition:'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow=`0 0 0 3px ${t.purple}30`}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
            >
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{ width:'100%', height:'100%', background:t.purple, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14 }}>{(user?.user_metadata?.full_name||'U')[0]}</div>
              }
            </button>
          </div>
        </header>

        <div style={{ display:'flex', minHeight:'calc(100vh - 56px)' }}>
          <main style={{ flex:1, padding:'32px 28px', overflowY:'auto' }}>

            {/* INPUT */}
            {step === 'input' && (
              <div style={{ maxWidth:680, margin:'0 auto' }}>
                <div className="fade-up" style={{ marginBottom:36 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20, border:`1px solid ${t.purple}40`, background:t.purpleLight, marginBottom:18 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:t.purple, display:'inline-block' }} />
                    <span style={{ fontSize:11, color:t.purpleText, fontWeight:600, letterSpacing:'0.06em' }}>AI-POWERED ASSESSMENT</span>
                  </div>
                  <h1 style={{ fontFamily:fonts.display, fontSize:'clamp(26px,4vw,42px)', fontWeight:800, lineHeight:1.1, letterSpacing:'-0.03em', marginBottom:14 }}>
                    Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'} 👋
                  </h1>
                  <p style={{ fontSize:15, color:t.textSecondary, lineHeight:1.7, maxWidth:500 }}>
                    Paste a job description and resume. AI conducts a conversational assessment to verify actual proficiency — then builds a personalized learning plan.
                  </p>
                </div>

                <div className="fade-up-1" style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <InputCard t={t} label="Job Description" icon="📋">
                    <textarea value={jdText} onChange={e=>setJdText(e.target.value)} placeholder="Paste the full job description here..." style={textareaStyle(t,156)} />
                  </InputCard>
                  <InputCard t={t} label="Candidate Resume" icon="📄">
                    <div style={{ display:'flex', gap:10, marginBottom:10, alignItems:'center' }}>
                      <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 13px', borderRadius:8, border:`1px solid ${t.border}`, background:t.bgSecondary, fontSize:13, color:t.textSecondary, cursor:'pointer', fontWeight:500 }}>
                        ⬆ {resumeFileName || 'Upload PDF'}
                        <input type="file" accept=".pdf" onChange={handlePDFUpload} style={{ display:'none' }} />
                      </label>
                      {loading && <span style={{ fontSize:12, color:t.textTertiary }}>Extracting...</span>}
                      {resumeFileName && !loading && <span style={{ fontSize:12, color:t.green }}>✓ {resumeFileName}</span>}
                      <span style={{ fontSize:12, color:t.textTertiary }}>or paste below</span>
                    </div>
                    <textarea value={resumeText} onChange={e=>setResumeText(e.target.value)} placeholder="Paste resume text here..." style={textareaStyle(t,188)} />
                  </InputCard>
                  {error && <ErrorState message={error} onRetry={()=>setError('')} onDismiss={()=>setError('')} t={t} />}
                  <button onClick={handleAnalyze} disabled={loading||!jdText.trim()||!resumeText.trim()} style={{ padding:'13px 28px', borderRadius:10, fontSize:15, fontWeight:600, background:t.text, color:t.accentText, border:'none', opacity:loading||!jdText.trim()||!resumeText.trim()?0.4:1, transition:'all 0.15s', display:'inline-flex', alignItems:'center', gap:8, alignSelf:'flex-start', letterSpacing:'-0.01em', boxShadow:t.shadow }}>
                    Analyze skills
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
                <div className="fade-up-2" style={{ display:'flex', gap:12, marginTop:32, flexWrap:'wrap' }}>
                  {['🔍 Deep skill parsing','🎙️ Voice interviews','📚 Curated learning paths'].map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:8, border:`1px solid ${t.border}`, background:t.bgCard, fontSize:12, color:t.textSecondary, boxShadow:t.shadow }}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {/* ANALYZING */}
            {step === 'analyzing' && (
              <div style={{ maxWidth:480, margin:'100px auto', textAlign:'center' }}>
                <div style={{ width:56, height:56, borderRadius:'50%', border:`3px solid ${t.border}`, borderTopColor:t.purple, animation:'spin 0.9s linear infinite', margin:'0 auto 24px' }} />
                <div style={{ fontFamily:fonts.display, fontSize:22, fontWeight:800, marginBottom:12, letterSpacing:'-0.02em' }}>Analyzing...</div>
                {['Parsing resume','Extracting JD requirements','Computing skill gaps'].map((s,i) => (
                  <div key={s} style={{ fontSize:13, color:t.textSecondary, marginBottom:4, animation:`shimmer 1.4s ${i*0.4}s ease-in-out infinite` }}>{s}</div>
                ))}
              </div>
            )}

            {/* GAPS */}
            {step === 'gaps' && session && (
              <div style={{ maxWidth:700, margin:'0 auto' }} className="fade-up">
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontFamily:fonts.display, fontSize:28, fontWeight:800, letterSpacing:'-0.03em', marginBottom:10 }}>{session.candidate?.name||'Candidate'}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Chip t={t} color="purple">{session.jd?.role_title}</Chip>
                    <Chip t={t} color="default">{session.candidate?.years_experience} yrs exp</Chip>
                    <Chip t={t} color="red">{session.gaps?.filter(g=>g.severity==='critical').length} critical gaps</Chip>
                  </div>
                </div>
                {error && <ErrorState message={error} onRetry={()=>setError('')} onDismiss={()=>setError('')} t={t} />}
                {session.skills_to_assess?.length > 0 ? (
                  <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:18, background:t.purpleLight, border:`1px solid ${t.purple}30`, fontSize:13, color:t.purpleText }}>
                    Click <strong>"Assess"</strong> on any gap below, then generate your personalized learning plan.
                  </div>
                ) : (
                  <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:18, background:t.greenLight, border:`1px solid ${t.green}30`, fontSize:13, color:t.green }}>
                    ✓ No critical gaps — candidate looks like a strong fit!
                  </div>
                )}
                <GapReport gaps={session.gaps} assessments={session.assessments} skillsToAssess={session.skills_to_assess} onStartAssessment={handleStartAssessment} activeSkill={activeSkill} t={t} />
                <button onClick={handleGeneratePlan} disabled={loading} style={{ marginTop:20, padding:'12px 24px', borderRadius:10, fontSize:14, fontWeight:600, background:t.green, color:'#fff', border:'none', opacity:loading?0.5:1, transition:'all 0.15s', display:'inline-flex', alignItems:'center', gap:8, boxShadow:t.shadow }}>
                  {loading ? 'Generating...' : 'Generate learning plan →'}
                </button>
              </div>
            )}

            {/* ASSESSING */}
            {step === 'assessing' && (
              <div style={{ maxWidth:660, margin:'0 auto', display:'flex', flexDirection:'column', height:'calc(100vh - 120px)' }}>
                <div className="fade-up" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
                  <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', color:t.textTertiary }}>MODE</span>
                  {['voice','text'].map(mode => (
                    <button key={mode} onClick={()=>setInterviewMode(mode)} style={{ padding:'5px 14px', borderRadius:6, fontSize:12, fontWeight:600, background:interviewMode===mode?t.text:'transparent', color:interviewMode===mode?t.accentText:t.textSecondary, border:`1px solid ${interviewMode===mode?t.text:t.border}`, transition:'all 0.15s' }}>
                      {mode==='voice'?'🎙 Voice':'💬 Text'}
                    </button>
                  ))}
                  <div style={{ marginLeft:'auto', fontSize:13, color:t.textSecondary }}>Skill: <span style={{ color:t.purple, fontWeight:600 }}>{activeSkill}</span></div>
                </div>
                {interviewMode === 'voice' && (
                  <VoiceInterview sessionId={session?.session_id} skill={activeSkill} apiChat={api.chat} apiStartAssessment={api.startAssessment} t={t}
                    onComplete={(assessmentData) => { setSession(prev => ({ ...prev, assessments:{ ...(prev.assessments||{}), [activeSkill]:assessmentData } })); setStep('gaps'); }}
                    onBack={()=>setInterviewMode('text')}
                  />
                )}
                {interviewMode === 'text' && (
                  <>
                    <div style={{ flex:1, overflowY:'auto', marginBottom:14, display:'flex', flexDirection:'column', gap:10 }}>
                      {messages.map((msg,i) => (
                        <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':msg.role==='system'?'center':'flex-start', animation:'fadeUp 0.3s ease' }}>
                          {msg.role==='system' ? (
                            <div style={{ fontSize:11, color:t.textTertiary, padding:'4px 12px', background:t.bgSecondary, borderRadius:20 }}>{msg.content}</div>
                          ) : (
                            <div style={{ maxWidth:'82%', padding:'12px 16px', borderRadius:12, fontSize:14, lineHeight:1.65, background:msg.role==='user'?t.chatUserBg:t.chatAiBg, color:msg.role==='user'?t.chatUserText:t.text, border:msg.role==='user'?'none':`1px solid ${t.chatAiBorder}`, boxShadow:t.shadow, borderBottomRightRadius:msg.role==='user'?3:12, borderBottomLeftRadius:msg.role==='user'?12:3 }}>
                              {msg.role==='assistant' && <div style={{ fontSize:10, color:t.purple, fontWeight:700, letterSpacing:'0.06em', marginBottom:5 }}>AI INTERVIEWER</div>}
                              {msg.content}
                            </div>
                          )}
                        </div>
                      ))}
                      {loading && (
                        <div style={{ display:'flex', gap:5, padding:'12px 16px', background:t.chatAiBg, border:`1px solid ${t.chatAiBorder}`, borderRadius:12, width:70, boxShadow:t.shadow }}>
                          {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:'50%', background:t.textTertiary, animation:`bounce 1s ${i*0.2}s infinite` }}/>)}
                        </div>
                      )}
                      <div ref={chatBottomRef}/>
                    </div>
                    {error && <ErrorState message={error} onRetry={()=>setError('')} onDismiss={()=>setError('')} t={t} />}
                    <div style={{ display:'flex', gap:10 }}>
                      <input value={userInput} onChange={e=>setUserInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&handleSend()} placeholder="Type your answer..." disabled={loading||assessmentDone}
                        style={{ flex:1, padding:'12px 16px', fontSize:14, borderRadius:10, border:`1px solid ${t.border}`, outline:'none', background:t.bgInput, color:t.text }}
                        onFocus={e=>{e.target.style.borderColor=t.purple;e.target.style.boxShadow=`0 0 0 3px ${t.purple}18`;}}
                        onBlur={e=>{e.target.style.borderColor=t.border;e.target.style.boxShadow='none';}}
                      />
                      <button onClick={handleSend} disabled={loading||!userInput.trim()} style={{ padding:'12px 20px', borderRadius:10, fontSize:14, fontWeight:600, background:t.text, color:t.accentText, border:'none', opacity:loading||!userInput.trim()?0.4:1, transition:'all 0.15s' }}>
                        Send ↑
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PLAN */}
            {step === 'plan' && (
              <div style={{ maxWidth:720, margin:'0 auto' }} className="fade-up">
                <LearningPlan plan={learningPlan} t={t} />
              </div>
            )}
          </main>

          {/* SIDEBAR */}
          {sidebarVisible && (
            <aside style={{ width:340, flexShrink:0, borderLeft:`1px solid ${t.border}`, background:t.bgCard, padding:'24px 20px', overflowY:'auto', transition:'background 0.3s,border-color 0.3s' }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:t.textTertiary, marginBottom:14 }}>SKILL GAP REPORT</div>
              <GapReport gaps={session?.gaps} assessments={session?.assessments} skillsToAssess={session?.skills_to_assess} onStartAssessment={handleStartAssessment} activeSkill={activeSkill} t={t} />
              {step !== 'plan' && (
                <button onClick={handleGeneratePlan} disabled={loading} style={{ marginTop:16, width:'100%', padding:'11px', borderRadius:10, background:t.green, color:'#fff', border:'none', fontWeight:600, fontSize:13, cursor:'pointer', opacity:loading?0.5:1 }}>
                  Generate learning plan →
                </button>
              )}
            </aside>
          )}
        </div>

        {/* PROFILE PANEL */}
        {showProfile && <ProfilePage t={t} onClose={()=>setShowProfile(false)} onLoadSession={handleLoadSession} />}
      </div>
    </ThemeContext.Provider>
  );
}
