import React from 'react';
import { useAuth } from '../AuthContext';

export default function LoginPage({ t }) {
  const { signInWithGitHub } = useAuth();

  return (
    <div style={{
      minHeight: '100vh', background: t.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.5s ease both; }
      `}</style>

      <div className="fade-up" style={{ maxWidth: 440, width: '100%', padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M2 10L5 4L8 8L10 6L13 10" stroke={t.accentText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: t.text, letterSpacing: '-0.02em' }}>
            SkillGap<span style={{ color: t.purple }}>AI</span>
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: t.bgCard, borderRadius: 16,
          border: `1px solid ${t.border}`,
          padding: '36px 32px',
          boxShadow: t.shadow,
        }}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800,
            color: t.text, letterSpacing: '-0.03em', marginBottom: 8,
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.6, marginBottom: 28 }}>
            Sign in to access your skill assessments, learning plans, and assessment history.
          </p>

          {/* GitHub button */}
          <button
            onClick={signInWithGitHub}
            style={{
              width: '100%', padding: '12px 20px',
              borderRadius: 10, fontSize: 15, fontWeight: 600,
              background: t.isDark ? '#F0EDE8' : '#24292F',
              color: t.isDark ? '#111010' : '#FFFFFF',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'opacity 0.15s, transform 0.15s',
              boxShadow: t.shadow,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.opacity = '0.92'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.opacity = '1'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>

          <p style={{ fontSize: 12, color: t.textTertiary, textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
            Free to use · No credit card required · Your data is private
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🔍 Skill gap analysis', '🎙 Voice interviews', '📚 Learning plans'].map(f => (
            <div key={f} style={{
              fontSize: 12, color: t.textSecondary,
              padding: '5px 12px', borderRadius: 20,
              border: `1px solid ${t.border}`, background: t.bgCard,
            }}>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
