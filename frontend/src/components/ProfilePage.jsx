import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { getUserSessions, deleteSession } from '../db';

export default function ProfilePage({ t, onClose, onLoadSession }) {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    if (user) {
      getUserSessions(user.id).then(s => { setSessions(s); setLoading(false); });
    }
  }, [user]);

  const handleDelete = async (id) => {
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const avatar = user?.user_metadata?.avatar_url;
  const name   = user?.user_metadata?.full_name || user?.user_metadata?.user_name || 'User';
  const email  = user?.email;
  const github = user?.user_metadata?.user_name;

  const totalAssessments = sessions.reduce((acc, s) => acc + Object.keys(s.assessments || {}).length, 0);
  const avgScore = sessions.length
    ? (sessions.reduce((acc, s) => {
        const scores = Object.values(s.assessments || {}).map(a => a.score || 0);
        return acc + (scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
      }, 0) / sessions.length).toFixed(1)
    : '—';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: t.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, height: '100vh', background: t.bgCard,
        borderLeft: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.25s ease',
        overflowY: 'auto',
      }}>
        <style>{`
          @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: t.text }}>Profile</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textTertiary, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* User info */}
        <div style={{ padding: '24px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            {avatar
              ? <img src={avatar} alt={name} style={{ width: 52, height: 52, borderRadius: '50%', border: `2px solid ${t.border}` }} />
              : <div style={{ width: 52, height: 52, borderRadius: '50%', background: t.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20 }}>{name[0]}</div>
            }
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: t.text, marginBottom: 2 }}>{name}</div>
              <div style={{ fontSize: 12, color: t.textSecondary }}>{email}</div>
              {github && (
                <a href={`https://github.com/${github}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: t.purple, textDecoration: 'none' }}>
                  @{github}
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Analyses', value: sessions.length },
              { label: 'Assessed', value: totalAssessments },
              { label: 'Avg score', value: avgScore },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '10px 6px', background: t.bgSecondary, borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: t.purple }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${t.border}`, padding: '0 24px' }}>
          {['history', 'account'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '12px 16px', fontSize: 13, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? t.purple : t.textSecondary,
              borderBottom: `2px solid ${activeTab === tab ? t.purple : 'transparent'}`,
              transition: 'all 0.15s', textTransform: 'capitalize',
            }}>{tab}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div>
              {loading && <div style={{ textAlign: 'center', color: t.textTertiary, fontSize: 13, padding: '40px 0' }}>Loading...</div>}
              {!loading && sessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <div style={{ fontSize: 14, color: t.textSecondary }}>No assessments yet</div>
                  <div style={{ fontSize: 12, color: t.textTertiary, marginTop: 4 }}>Start an analysis to see history here</div>
                </div>
              )}
              {sessions.map((s, i) => {
                const gapCount = (s.gaps || []).filter(g => g.severity === 'critical').length;
                const assessed = Object.keys(s.assessments || {}).length;
                return (
                  <div key={s.id} style={{
                    padding: '12px 14px', borderRadius: 10, marginBottom: 10,
                    border: `1px solid ${t.border}`, background: t.bg,
                    animation: `fadeUp 0.3s ${i * 0.04}s ease both`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{s.candidate_name}</div>
                        <div style={{ fontSize: 12, color: t.purple, marginTop: 1 }}>{s.role_title}</div>
                      </div>
                      <div style={{ fontSize: 11, color: t.textTertiary }}>{formatDate(s.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: t.redLight, color: t.red }}>{gapCount} critical gaps</span>
                      {assessed > 0 && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: t.purpleLight, color: t.purpleText }}>{assessed} assessed</span>}
                      {s.time_to_ready_weeks && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: t.greenLight, color: t.green }}>{s.time_to_ready_weeks}w plan</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {onLoadSession && (
                        <button onClick={() => { onLoadSession(s); onClose(); }} style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 6,
                          background: t.purple, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500,
                        }}>
                          View →
                        </button>
                      )}
                      <button onClick={() => handleDelete(s.id)} style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 6,
                        background: 'transparent', color: t.textTertiary,
                        border: `1px solid ${t.border}`, cursor: 'pointer',
                      }}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '14px', borderRadius: 10, background: t.bgSecondary, fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: t.text, marginBottom: 4 }}>Account type</div>
                Free plan · GitHub OAuth
              </div>
              <div style={{ padding: '14px', borderRadius: 10, background: t.bgSecondary, fontSize: 13, color: t.textSecondary, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: t.text, marginBottom: 4 }}>Data & Privacy</div>
                Your assessments are stored privately and only visible to you. We don't share your data with anyone.
              </div>
              <button onClick={signOut} style={{
                padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: t.redLight, color: t.red, border: `1px solid ${t.red}30`,
                cursor: 'pointer', transition: 'all 0.15s', marginTop: 8,
              }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
