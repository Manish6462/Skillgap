import React, { useState, useEffect, useRef, useCallback } from 'react';

const AVATAR_STATES = {
  idle: { emoji: '🎙️', label: 'Ready', color: '#534AB7', pulse: false },
  speaking: { emoji: '🔊', label: 'AI Speaking...', color: '#0F6E56', pulse: true },
  listening: { emoji: '👂', label: 'Listening...', color: '#d85a30', pulse: true },
  thinking: { emoji: '⚙️', label: 'Processing...', color: '#ba7517', pulse: true },
  complete: { emoji: '✅', label: 'Complete', color: '#639922', pulse: false },
};

export default function VoiceInterview({
  sessionId,
  skill,
  onComplete,
  onBack,
  apiChat,
  apiStartAssessment,
}) {
  const [avatarState, setAvatarState] = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const isListeningRef = useRef(false);
  const transcriptBottomRef = useRef(null);

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognition && !!window.speechSynthesis;

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);

      // Pick a good voice — prefer female English voices for interviewer feel
      const voices = synthRef.current.getVoices();
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Google UK English Female'))
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

      if (preferred) utter.voice = preferred;
      utter.rate = 0.92;
      utter.pitch = 1.05;
      utter.volume = 1;

      setAvatarState('speaking');
      setCurrentQuestion(text);

      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      synthRef.current.speak(utter);
    });
  }, []);

  const startListening = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let silenceTimer = null;

      const resetSilenceTimer = () => {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (finalTranscript.trim().length > 10) {
            recognition.stop();
          }
        }, 2500); // stop after 2.5s of silence if we have content
      };

      recognition.onstart = () => {
        isListeningRef.current = true;
        setAvatarState('listening');
        setInterimText('');
      };

      recognition.onresult = (e) => {
        let interim = '';
        finalTranscript = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript + ' ';
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        setInterimText(interim);
        if (finalTranscript.trim()) resetSilenceTimer();
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        clearTimeout(silenceTimer);
        setInterimText('');
        resolve(finalTranscript.trim());
      };

      recognition.onerror = (e) => {
        isListeningRef.current = false;
        clearTimeout(silenceTimer);
        if (e.error === 'no-speech') {
          resolve(''); // treat as empty, not error
        } else {
          reject(new Error(e.error));
        }
      };

      recognition.start();
    });
  }, [SpeechRecognition]);

  const runInterviewTurn = useCallback(async (questionText, isFirst = false) => {
    // Speak the question
    setTranscript(prev => [...prev, { role: 'ai', text: questionText }]);
    await speak(questionText);

    // Small pause before listening
    await new Promise(r => setTimeout(r, 600));

    // Listen for answer
    setAvatarState('listening');
    let answer = '';
    try {
      answer = await startListening();
    } catch (e) {
      setError('Microphone error: ' + e.message);
      setAvatarState('idle');
      return;
    }

    if (!answer.trim()) {
      // Re-prompt once if no answer detected
      await speak("I didn't catch that. Could you please repeat your answer?");
      answer = await startListening();
    }

    setTranscript(prev => [...prev, { role: 'user', text: answer || '(no response detected)' }]);
    setAvatarState('thinking');

    // Send to backend
    try {
      const data = await apiChat(sessionId, answer || 'I am not sure');

      if (data.is_complete) {
        setAssessmentResult(data.assessment_data);
        setAvatarState('complete');
        const closingMsg = `Assessment complete. ${data.assessment_data?.summary || 'Thank you for your responses.'}`;
        setTranscript(prev => [...prev, { role: 'ai', text: closingMsg }]);
        await speak(closingMsg);
        onComplete(data.assessment_data);
      } else {
        await runInterviewTurn(data.reply);
      }
    } catch (e) {
      setError('Connection error. Please try again.');
      setAvatarState('idle');
    }
  }, [speak, startListening, apiChat, sessionId, onComplete]);

  const handleStart = async () => {
    setError('');
    setIsStarted(true);
    setTranscript([]);
    setAvatarState('thinking');

    // Request mic permission early
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
    } catch {
      setError('Microphone permission denied. Please allow microphone access and try again.');
      setIsStarted(false);
      setAvatarState('idle');
      return;
    }

    // Start the assessment
    try {
      const data = await apiStartAssessment(sessionId, skill);
      await runInterviewTurn(data.question, true);
    } catch (e) {
      setError('Failed to start interview. Please try again.');
      setIsStarted(false);
      setAvatarState('idle');
    }
  };

  const handleStop = () => {
    synthRef.current?.cancel();
    recognitionRef.current?.abort();
    isListeningRef.current = false;
    setAvatarState('idle');
    setIsStarted(false);
    setInterimText('');
  };

  if (!supported) {
    return (
      <div style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Voice interview not supported</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
          Your browser doesn't support Web Speech API. Please use Chrome or Edge.
        </div>
        <button onClick={onBack} style={btnStyle('#534AB7')}>← Back to text interview</button>
      </div>
    );
  }

  const state = AVATAR_STATES[avatarState];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>

      {/* Interview room header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 0', marginBottom: 16,
      }}>
        <div>
          <span style={{ fontWeight: 500, fontSize: 15 }}>Voice Interview</span>
          <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
            Skill: <strong style={{ color: '#534AB7' }}>{skill}</strong>
          </span>
        </div>
        <button onClick={() => { handleStop(); onBack(); }} style={{
          fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer'
        }}>
          ← Switch to text
        </button>
      </div>

      {/* Avatar / video panel */}
      <div style={{
        background: '#1a1a2e', borderRadius: 16, padding: '32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginBottom: 16, position: 'relative', overflow: 'hidden',
      }}>
        {/* Animated background ring */}
        {state.pulse && (
          <div style={{
            position: 'absolute', width: 160, height: 160, borderRadius: '50%',
            border: `2px solid ${state.color}40`,
            animation: 'ring-pulse 1.5s ease-out infinite',
          }} />
        )}

        {/* Avatar circle */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: `${state.color}22`,
          border: `3px solid ${state.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, marginBottom: 16, zIndex: 1,
          transition: 'border-color 0.3s, background 0.3s',
          boxShadow: state.pulse ? `0 0 24px ${state.color}66` : 'none',
        }}>
          {state.emoji}
        </div>

        {/* AI name + status */}
        <div style={{ color: '#fff', fontWeight: 500, fontSize: 15, marginBottom: 4 }}>
          AI Interviewer
        </div>
        <div style={{
          fontSize: 12, color: state.color, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {state.pulse && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: state.color,
              display: 'inline-block', animation: 'blink 1s infinite',
            }} />
          )}
          {state.label}
        </div>

        {/* Current question display */}
        {currentQuestion && avatarState === 'speaking' && (
          <div style={{
            marginTop: 16, padding: '10px 16px', borderRadius: 8,
            background: '#ffffff15', color: '#ddd', fontSize: 13,
            maxWidth: 400, textAlign: 'center', lineHeight: 1.5, zIndex: 1,
          }}>
            "{currentQuestion}"
          </div>
        )}

        {/* Interim speech display */}
        {interimText && avatarState === 'listening' && (
          <div style={{
            marginTop: 16, padding: '8px 14px', borderRadius: 8,
            background: '#d85a3022', border: '1px solid #d85a3055',
            color: '#d85a30', fontSize: 13, maxWidth: 400,
            textAlign: 'center', fontStyle: 'italic', zIndex: 1,
          }}>
            {interimText}...
          </div>
        )}

        <style>{`
          @keyframes ring-pulse {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>

      {/* Transcript */}
      <div style={{
        flex: 1, overflowY: 'auto', marginBottom: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {transcript.length === 0 && !isStarted && (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, marginTop: 20 }}>
            Click "Start Interview" to begin your voice assessment
          </div>
        )}
        {transcript.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%', padding: '8px 13px', borderRadius: 10,
              fontSize: 13, lineHeight: 1.6,
              background: msg.role === 'user' ? '#534AB7' : '#f0ede8',
              color: msg.role === 'user' ? '#fff' : '#1a1a1a',
            }}>
              {msg.role === 'ai' && (
                <div style={{ fontSize: 10, color: '#888', marginBottom: 3, fontWeight: 500 }}>AI INTERVIEWER</div>
              )}
              {msg.role === 'user' && (
                <div style={{ fontSize: 10, color: '#ffffff99', marginBottom: 3, fontWeight: 500 }}>YOU (transcribed)</div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={transcriptBottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ color: '#d85a30', fontSize: 12, marginBottom: 8, padding: '8px 12px', background: '#fff0ee', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10 }}>
        {!isStarted ? (
          <button
            onClick={handleStart}
            style={{ ...btnStyle('#534AB7'), flex: 1, fontSize: 15, padding: '12px' }}
          >
            🎙️ Start Voice Interview
          </button>
        ) : avatarState !== 'complete' ? (
          <button
            onClick={handleStop}
            style={{ ...btnStyle('#d85a30'), flex: 1 }}
          >
            ⏹ Stop Interview
          </button>
        ) : (
          <button
            onClick={onBack}
            style={{ ...btnStyle('#0F6E56'), flex: 1 }}
          >
            View gap report & generate plan →
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 8 }}>
        🎙️ Speak clearly · Chrome/Edge recommended · Answers are auto-transcribed
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    background: bg, color: '#fff', border: 'none', cursor: 'pointer',
  };
}
