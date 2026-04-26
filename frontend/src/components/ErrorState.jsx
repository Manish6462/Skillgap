import React from 'react';

const ERRORS = {
  quota: {
    icon: '⚡',
    title: 'API quota reached',
    subtitle: 'Running in demo mode',
    message: 'The live AI API quota has been reached. The app is now running with pre-built demo data so you can still see the full experience.',
    color: '#F59E0B',
    lightBg: '#FEF3C7',
    action: 'Continue with demo →',
  },
  network: {
    icon: '🔌',
    title: 'Connection error',
    subtitle: 'Backend unreachable',
    message: 'Could not reach the backend server. Make sure the FastAPI server is running on port 8000.',
    color: '#E5533A',
    lightBg: '#FEE8E4',
    action: 'Retry',
  },
  parse: {
    icon: '🔧',
    title: 'Processing error',
    subtitle: 'Could not parse response',
    message: 'The AI response was in an unexpected format. This can happen with complex inputs — try simplifying the JD or resume.',
    color: '#6366F1',
    lightBg: '#EEF2FF',
    action: 'Try again',
  },
  generic: {
    icon: '⚠️',
    title: 'Something went wrong',
    subtitle: 'Unexpected error',
    message: 'An unexpected error occurred. The demo mode will activate automatically as fallback.',
    color: '#6B7280',
    lightBg: '#F3F4F6',
    action: 'Try again',
  },
};

export function classifyError(errorMsg) {
  const msg = (errorMsg || '').toLowerCase();
  if (msg.includes('quota') || msg.includes('429') || msg.includes('exhausted') || msg.includes('rate limit')) return 'quota';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('failed to fetch')) return 'network';
  if (msg.includes('parse') || msg.includes('json') || msg.includes('unexpected token')) return 'parse';
  return 'generic';
}

export default function ErrorState({ message, onRetry, onDismiss, t }) {
  const type = classifyError(message);
  const e = ERRORS[type];
  const isDark = t?.isDark;

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 12, marginBottom: 16,
      background: isDark ? `${e.color}18` : e.lightBg,
      border: `1px solid ${e.color}40`,
      display: 'flex', gap: 14, alignItems: 'flex-start',
      animation: 'fadeUp 0.3s ease',
    }}>
      <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{e.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: e.color }}>{e.title}</span>
          <span style={{ fontSize: 11, color: t?.textTertiary, padding: '1px 7px', borderRadius: 4, background: isDark ? `${e.color}25` : `${e.color}18`, fontWeight: 500 }}>
            {e.subtitle}
          </span>
        </div>
        <p style={{ fontSize: 13, color: t?.textSecondary, lineHeight: 1.55, marginBottom: 10 }}>
          {e.message}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {onRetry && (
            <button onClick={onRetry} style={{
              fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7,
              background: e.color, color: '#fff', border: 'none', cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}>
              {e.action}
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} style={{
              fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 7,
              background: 'transparent', color: t?.textSecondary, border: `1px solid ${t?.border}`, cursor: 'pointer',
            }}>
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline banner for non-blocking errors
export function ErrorBanner({ message, onDismiss, t }) {
  if (!message) return null;
  const type = classifyError(message);
  const e = ERRORS[type];
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 8, marginBottom: 10,
      background: t?.isDark ? `${e.color}18` : e.lightBg,
      border: `1px solid ${e.color}35`,
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
    }}>
      <span>{e.icon}</span>
      <span style={{ color: e.color, fontWeight: 500, flex: 1 }}>{e.title} —</span>
      <span style={{ color: t?.textSecondary }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: t?.textTertiary, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
      )}
    </div>
  );
}
