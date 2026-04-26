import React, { useState, useEffect, useRef, useCallback } from 'react';

const AVATAR_STATES = {
  idle:      { emoji:'🎙️', label:'Ready',          color:'#7B6FF0', pulse:false },
  speaking:  { emoji:'🔊', label:'AI Speaking...', color:'#34C478', pulse:true  },
  listening: { emoji:'👂', label:'Listening...',   color:'#F59E0B', pulse:true  },
  thinking:  { emoji:'⚙️', label:'Processing...',  color:'#60A5FA', pulse:true  },
  complete:  { emoji:'✅', label:'Complete',        color:'#34C478', pulse:false },
};

export default function VoiceInterview({ sessionId, skill, onComplete, onBack, apiChat, apiStartAssessment, t }) {
  const [avatarState, setAvatarState] = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [assessmentResult, setAssessmentResult] = useState(null);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const transcriptBottomRef = useRef(null);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition && !!window.speechSynthesis;

  useEffect(() => { transcriptBottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [transcript, interimText]);
  useEffect(() => { return () => { synthRef.current?.cancel(); recognitionRef.current?.abort(); }; }, []);

  const speak = useCallback((text) => new Promise((resolve) => {
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google UK English Female')))
      || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utter.voice = preferred;
    utter.rate = 0.92; utter.pitch = 1.05; utter.volume = 1;
    setAvatarState('speaking'); setCurrentQuestion(text);
    utter.onend = () => resolve(); utter.onerror = () => resolve();
    synthRef.current.speak(utter);
  }), []);

  const startListening = useCallback(() => new Promise((resolve, reject) => {
    if (!SpeechRecognition) { reject(new Error('Not supported')); return; }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';
    let finalTranscript = '';
    let silenceTimer = null;
    const resetSilenceTimer = () => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => { if (finalTranscript.trim().length > 8) recognition.stop(); }, 2500);
    };
    recognition.onstart = () => { setAvatarState('listening'); setInterimText(''); };
    recognition.onresult = (e) => {
      let interim = ''; finalTranscript = '';
      for (let i=0; i<e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setInterimText(interim);
      if (finalTranscript.trim()) resetSilenceTimer();
    };
    recognition.onend = () => { clearTimeout(silenceTimer); setInterimText(''); resolve(finalTranscript.trim()); };
    recognition.onerror = (e) => { clearTimeout(silenceTimer); if (e.error==='no-speech') resolve(''); else reject(new Error(e.error)); };
    recognition.start();
  }), [SpeechRecognition]);

  const runTurn = useCallback(async (questionText) => {
    setTranscript(prev => [...prev, { role:'ai', text:questionText }]);
    await speak(questionText);
    await new Promise(r => setTimeout(r, 600));
    setAvatarState('listening');
    let answer = '';
    try { answer = await startListening(); } catch(e) { setError('Mic error: '+e.message); setAvatarState('idle'); return; }
    if (!answer.trim()) {
      await speak("I didn't catch that. Could you repeat your answer?");
      answer = await startListening();
    }
    setTranscript(prev => [...prev, { role:'user', text:answer||'(no response detected)' }]);
    setAvatarState('thinking');
    try {
      const data = await apiChat(sessionId, answer||'I am not sure');
      if (data.is_complete) {
        setAssessmentResult(data.assessment_data);
        setAvatarState('complete');
        const msg = `Assessment complete. ${data.assessment_data?.summary||'Thank you.'}`;
        setTranscript(prev => [...prev, { role:'ai', text:msg }]);
        await speak(msg); onComplete(data.assessment_data);
      } else { await runTurn(data.reply); }
    } catch(e) { setError('Connection error. Please try again.'); setAvatarState('idle'); }
  }, [speak, startListening, apiChat, sessionId, onComplete]);

  const handleStart = async () => {
    setError(''); setIsStarted(true); setTranscript([]); setAvatarState('thinking');
    try { await navigator.mediaDevices.getUserMedia({ audio:true }); } catch {
      setError('Microphone permission denied. Please allow access and try again.');
      setIsStarted(false); setAvatarState('idle'); return;
    }
    try {
      const data = await apiStartAssessment(sessionId, skill);
      await runTurn(data.question);
    } catch { setError('Failed to start interview.'); setIsStarted(false); setAvatarState('idle'); }
  };

  const handleStop = () => { synthRef.current?.cancel(); recognitionRef.current?.abort(); setAvatarState('idle'); setIsStarted(false); setInterimText(''); };

  if (!supported) return (
    <div style={{ textAlign:'center', padding:32 }}>
      <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
      <div style={{ fontWeight:600, marginBottom:8, color:t?.text }}>Voice not supported in this browser</div>
      <div style={{ fontSize:13, color:t?.textSecondary, marginBottom:20 }}>Please use Chrome or Edge for voice interviews.</div>
      <button onClick={onBack} style={{ padding:'10px 20px', borderRadius:8, background:t?.purple||'#5B4FE8', color:'#fff', border:'none', fontWeight:600, fontSize:14 }}>← Use text interview</button>
    </div>
  );

  const state = AVATAR_STATES[avatarState];
  const darkPanel = true; // voice panel is always dark for contrast

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <style>{`
        @keyframes ring-pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.6);opacity:0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes wave { 0%,100%{height:8px} 50%{height:24px} }
      `}</style>

      {/* Avatar panel */}
      <div style={{ background:'#0D0D14', borderRadius:16, padding:'28px 20px', display:'flex', flexDirection:'column', alignItems:'center', marginBottom:14, position:'relative', overflow:'hidden', flexShrink:0 }}>
        {/* Background glow */}
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:`radial-gradient(circle, ${state.color}18 0%, transparent 70%)`, pointerEvents:'none' }} />

        {/* Pulse rings */}
        {state.pulse && [0,1].map(i => (
          <div key={i} style={{ position:'absolute', width:120, height:120, borderRadius:'50%', border:`1.5px solid ${state.color}50`, animation:`ring-pulse 1.8s ${i*0.6}s ease-out infinite` }} />
        ))}

        {/* Avatar */}
        <div style={{ width:96, height:96, borderRadius:'50%', background:`${state.color}18`, border:`2.5px solid ${state.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, marginBottom:14, zIndex:1, transition:'border-color 0.4s, box-shadow 0.4s', boxShadow:state.pulse?`0 0 28px ${state.color}44`:'none' }}>
          {state.emoji}
        </div>

        <div style={{ color:'#F0EDE8', fontWeight:700, fontSize:14, marginBottom:4, fontFamily:"'Syne',sans-serif" }}>AI Interviewer</div>
        <div style={{ fontSize:12, color:state.color, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          {state.pulse && <span style={{ width:6, height:6, borderRadius:'50%', background:state.color, display:'inline-block', animation:'blink 1s infinite' }} />}
          {state.label}
        </div>

        {/* Sound wave animation while speaking */}
        {avatarState === 'speaking' && (
          <div style={{ display:'flex', gap:3, alignItems:'center', marginTop:12 }}>
            {[0,1,2,3,4,5,6].map(i => (
              <div key={i} style={{ width:3, background:state.color, borderRadius:2, animation:`wave 0.8s ${i*0.1}s ease-in-out infinite` }} />
            ))}
          </div>
        )}

        {/* Current question */}
        {currentQuestion && avatarState==='speaking' && (
          <div style={{ marginTop:14, padding:'10px 16px', borderRadius:10, background:'rgba(255,255,255,0.07)', color:'#C8C4BC', fontSize:13, maxWidth:420, textAlign:'center', lineHeight:1.55, zIndex:1 }}>
            "{currentQuestion}"
          </div>
        )}

        {/* Interim speech */}
        {interimText && avatarState==='listening' && (
          <div style={{ marginTop:12, padding:'8px 14px', borderRadius:8, background:`${state.color}18`, border:`1px solid ${state.color}44`, color:state.color, fontSize:13, maxWidth:380, textAlign:'center', fontStyle:'italic', zIndex:1 }}>
            {interimText}...
          </div>
        )}
      </div>

      {/* Transcript */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
        {transcript.length===0 && !isStarted && (
          <div style={{ textAlign:'center', color:t?.textTertiary, fontSize:13, marginTop:16 }}>
            Click "Start Voice Interview" to begin your assessment
          </div>
        )}
        {transcript.map((msg,i) => (
          <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start' }}>
            <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:11, fontSize:13, lineHeight:1.65, background:msg.role==='user'?(t?.chatUserBg||'#1C1A17'):(t?.chatAiBg||'#fff'), color:msg.role==='user'?(t?.chatUserText||'#fff'):(t?.text||'#1C1A17'), border:msg.role==='ai'?`1px solid ${t?.chatAiBorder||'#DDD'}`:'none', boxShadow:t?.shadow }}>
              {msg.role==='ai' && <div style={{ fontSize:10, color:t?.purple||'#5B4FE8', fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>AI INTERVIEWER</div>}
              {msg.role==='user' && <div style={{ fontSize:10, color:t?.isDark?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.6)', fontWeight:700, letterSpacing:'0.06em', marginBottom:4 }}>YOU (transcribed)</div>}
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={transcriptBottomRef} />
      </div>

      {error && <div style={{ padding:'8px 14px', borderRadius:8, background:t?.redLight||'#FEE8E4', color:t?.red||'#C23B22', fontSize:12, marginBottom:10 }}>{error}</div>}

      {/* Controls */}
      <div style={{ display:'flex', gap:10 }}>
        {!isStarted ? (
          <button onClick={handleStart} style={{ flex:1, padding:'13px', borderRadius:10, background:'#0D0D14', color:'#F0EDE8', border:`1px solid #2A2830`, fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#16151F'}
            onMouseLeave={e => e.currentTarget.style.background='#0D0D14'}
          >
            <span style={{ fontSize:18 }}>🎙</span> Start Voice Interview
          </button>
        ) : avatarState !== 'complete' ? (
          <button onClick={handleStop} style={{ flex:1, padding:'13px', borderRadius:10, background:t?.redLight||'#FEE8E4', color:t?.red||'#C23B22', border:'none', fontWeight:600, fontSize:14, transition:'all 0.15s' }}>
            ⏹ Stop
          </button>
        ) : (
          <button onClick={onBack} style={{ flex:1, padding:'13px', borderRadius:10, background:t?.green||'#1A7A4A', color:'#fff', border:'none', fontWeight:600, fontSize:14 }}>
            View results & generate plan →
          </button>
        )}
      </div>
      <div style={{ fontSize:11, color:t?.textTertiary, textAlign:'center', marginTop:8 }}>
        🎙 Speak clearly · Chrome/Edge only · Answers are auto-transcribed
      </div>
    </div>
  );
}
