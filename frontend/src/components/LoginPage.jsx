import React, { useState } from 'react';
import { supabase } from '../supabase';

const EyeIcon = ({ show }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {show
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    }
  </svg>
);

export default function LoginPage({ t }) {
  const [tab, setTab]           = useState('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [focusedField, setFocusedField] = useState('');

  const clearState = (nextTab) => {
    setEmail(''); setPassword(''); setConfirm('');
    setError(''); setSuccess(''); setShowPw(false); setShowCf(false);
    setTab(nextTab);
  };

  const friendlyError = (msg = '') => {
    if (msg.includes('Invalid login'))        return 'Incorrect email or password.';
    if (msg.includes('Email not confirmed'))  return 'Please verify your email before signing in.';
    if (msg.includes('already registered'))   return 'An account with this email already exists.';
    if (msg.includes('Password should'))      return 'Password must be at least 6 characters.';
    if (msg.includes('Unable to validate'))   return 'Please enter a valid email address.';
    if (msg.includes('rate limit'))           return 'Too many attempts. Please wait a moment.';
    return msg || 'Something went wrong. Please try again.';
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(friendlyError(err.message));
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password !== confirm)            { setError('Passwords do not match.'); return; }
    if (password.length < 6)            { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) setError(friendlyError(err.message));
    else     setSuccess('Account created! You are now signed in.');
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) setError(friendlyError(err.message));
    else     setSuccess('Password reset email sent! Check your inbox.');
    setLoading(false);
  };

  const inputStyle = (id) => ({
    width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 9,
    border: `1.5px solid ${focusedField === id ? t.purple : t.border}`,
    background: t.bgInput, color: t.text,
    outline: 'none', fontFamily: 'inherit',
    boxShadow: focusedField === id ? `0 0 0 3px ${t.purple}18` : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  });

  const pwInputStyle = (id) => ({
    ...inputStyle(id), paddingRight: 42,
  });

  const btnStyle = (disabled) => ({
    width: '100%', padding: '12px', borderRadius: 9,
    fontSize: 14, fontWeight: 600,
    background: disabled ? t.bgTertiary : t.text,
    color: disabled ? t.textTertiary : t.accentText,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s', letterSpacing: '-0.01em',
  });

  const Spinner = () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${t.textTertiary}`, borderTopColor: t.accentText, animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
      {tab === 'signin' ? 'Signing in...' : tab === 'signup' ? 'Creating account...' : 'Sending...'}
    </span>
  );

  const ErrorBox = () => error
    ? <div style={{ fontSize: 12, color: t.red, padding: '8px 12px', borderRadius: 8, background: t.redLight, border: `1px solid ${t.red}30` }}>{error}</div>
    : null;

  const SuccessBox = () => success
    ? <div style={{ fontSize: 12, color: t.green, padding: '8px 12px', borderRadius: 8, background: t.greenLight, border: `1px solid ${t.green}30` }}>{success}</div>
    : null;

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px 16px' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .auth-fade { animation: fadeUp 0.4s ease both; }
      `}</style>

      <div className="auth-fade" style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M2 10L5 4L8 8L10 6L13 10" stroke={t.accentText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: t.text, letterSpacing: '-0.02em' }}>
            SkillGap<span style={{ color: t.purple }}>AI</span>
          </span>
        </div>

        {/* Card */}
        <div style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, boxShadow: t.shadow, overflow: 'hidden' }}>

          {/* Tabs */}
          {tab !== 'forgot' && (
            <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}` }}>
              {[['signin', 'Sign in'], ['signup', 'Create account']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => clearState(key)} style={{
                  flex: 1, padding: '14px 0', fontSize: 13, fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: tab === key ? t.text : t.textTertiary,
                  borderBottom: `2px solid ${tab === key ? t.purple : 'transparent'}`,
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>
          )}

          <div style={{ padding: '24px 24px 20px' }}>

            {/* SIGN IN */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, display: 'block', marginBottom: 5 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" autoComplete="email"
                    onFocus={() => setFocusedField('email-si')}
                    onBlur={() => setFocusedField('')}
                    style={inputStyle('email-si')}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Password</label>
                    <button type="button" onClick={() => clearState('forgot')} style={{ fontSize: 12, color: t.purple, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Your password" autoComplete="current-password"
                      onFocus={() => setFocusedField('pw-si')}
                      onBlur={() => setFocusedField('')}
                      style={pwInputStyle('pw-si')}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textTertiary, display: 'flex', alignItems: 'center', padding: 2 }}>
                      <EyeIcon show={showPw} />
                    </button>
                  </div>
                </div>
                <ErrorBox /><SuccessBox />
                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                  {loading ? <Spinner /> : 'Sign in'}
                </button>
              </form>
            )}

            {/* SIGN UP */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, display: 'block', marginBottom: 5 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" autoComplete="email"
                    onFocus={() => setFocusedField('email-su')}
                    onBlur={() => setFocusedField('')}
                    style={inputStyle('email-su')}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, display: 'block', marginBottom: 5 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 6 characters" autoComplete="new-password"
                      onFocus={() => setFocusedField('pw-su')}
                      onBlur={() => setFocusedField('')}
                      style={pwInputStyle('pw-su')}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textTertiary, display: 'flex', alignItems: 'center', padding: 2 }}>
                      <EyeIcon show={showPw} />
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, display: 'block', marginBottom: 5 }}>Confirm password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCf ? 'text' : 'password'} value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password" autoComplete="new-password"
                      onFocus={() => setFocusedField('cf-su')}
                      onBlur={() => setFocusedField('')}
                      style={pwInputStyle('cf-su')}
                    />
                    <button type="button" onClick={() => setShowCf(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textTertiary, display: 'flex', alignItems: 'center', padding: 2 }}>
                      <EyeIcon show={showCf} />
                    </button>
                  </div>
                </div>

                {password.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        height: 3, flex: 1, borderRadius: 2,
                        background: password.length >= i * 4
                          ? (password.length >= 10 ? t.green : password.length >= 6 ? t.amber : t.red)
                          : t.bgTertiary,
                        transition: 'background 0.2s',
                      }} />
                    ))}
                    <span style={{ fontSize: 11, color: t.textTertiary, marginLeft: 4 }}>
                      {password.length < 6 ? 'Too short' : password.length < 10 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}

                <ErrorBox /><SuccessBox />
                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                  {loading ? <Spinner /> : 'Create account'}
                </button>
                <p style={{ fontSize: 11, color: t.textTertiary, textAlign: 'center', margin: 0 }}>
                  By creating an account you agree to our terms of service.
                </p>
              </form>
            )}

            {/* FORGOT PASSWORD */}
            {tab === 'forgot' && (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: t.text, marginBottom: 6 }}>Reset your password</div>
                  <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.55 }}>
                    Enter your email and we'll send you a reset link.
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, display: 'block', marginBottom: 5 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" autoComplete="email"
                    onFocus={() => setFocusedField('email-fp')}
                    onBlur={() => setFocusedField('')}
                    style={inputStyle('email-fp')}
                  />
                </div>
                <ErrorBox /><SuccessBox />
                <button type="submit" disabled={loading} style={btnStyle(loading)}>
                  {loading ? <Spinner /> : 'Send reset link'}
                </button>
                <button type="button" onClick={() => clearState('signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: t.textSecondary, padding: '4px 0' }}>
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['🔒 Private & secure', '🔍 Skill gap analysis', '📚 Learning plans'].map(f => (
            <div key={f} style={{ fontSize: 12, color: t.textSecondary, padding: '5px 12px', borderRadius: 20, border: `1px solid ${t.border}`, background: t.bgCard }}>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
