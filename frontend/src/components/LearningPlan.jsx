import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const TYPE_ICON = {
  course: '🎓', tutorials: '📖', project: '🔨',
  docs: '📄', interactive: '⚡',
};

// ── YouTube video card ────────────────────────────────────────────────────────
function YouTubeCard({ video, t }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', gap: 10, textDecoration: 'none', color: 'inherit',
        padding: '10px 12px', borderRadius: 10,
        border: `1px solid ${hovered ? '#FF0000' : t.border}`,
        background: hovered ? (t.isDark ? '#1a0a0a' : '#fff8f8') : t.bgSecondary,
        transition: 'all 0.15s', alignItems: 'flex-start',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={video.thumbnail}
          alt={video.title}
          style={{ width: 96, height: 54, borderRadius: 6, objectFit: 'cover', display: 'block' }}
        />
        {/* Play button overlay */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)', borderRadius: 6,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <polygon points="3,1 9,5 3,9" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: t.text,
          lineHeight: 1.4, marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {video.title}
        </div>
        <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 2 }}>{video.channel}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#FF0000', fontWeight: 600 }}>
          <svg width="10" height="8" viewBox="0 0 18 14" fill="#FF0000">
            <path d="M17.5 2.3S17.3.9 16.7.3c-.7-.7-1.4-.7-1.8-.8C12.5-.1 9 0 9 0S5.5-.1 3.1-.5C2.7-.4 2-.4 1.3.3.7.9.5 2.3.5 2.3S.3 3.9.3 5.5v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.7.7 1.6.7 2 .8C4.7 13 9 13 9 13s3.5 0 5.9-.5c.4-.1 1.1-.1 1.8-.8.6-.6.8-2 .8-2s.2-1.6.2-3.2V5.5c0-1.6-.2-3.2-.2-3.2zM7.2 9V4l4.9 2.5L7.2 9z"/>
          </svg>
          YouTube
        </div>
      </div>
    </a>
  );
}

// ── YouTube section per skill ──────────────────────────────────────────────────
function YouTubeSection({ skill, level, t }) {
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [error, setError]     = useState('');

  const fetchVideos = useCallback(async () => {
    if (loaded) return;
    setLoading(true); setError('');
    try {
      const vids = await api.fetchYouTubeVideos(skill, level);
      setVideos(vids);
      setLoaded(true);
    } catch {
      setError('Could not load YouTube videos');
    }
    setLoading(false);
  }, [skill, level, loaded]);

  // Auto-fetch on mount
  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  return (
    <div style={{ marginTop: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <svg width="14" height="11" viewBox="0 0 18 14" fill="#FF0000">
          <path d="M17.5 2.3S17.3.9 16.7.3c-.7-.7-1.4-.7-1.8-.8C12.5-.1 9 0 9 0S5.5-.1 3.1-.5C2.7-.4 2-.4 1.3.3.7.9.5 2.3.5 2.3S.3 3.9.3 5.5v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.7.7 1.6.7 2 .8C4.7 13 9 13 9 13s3.5 0 5.9-.5c.4-.1 1.1-.1 1.8-.8.6-.6.8-2 .8-2s.2-1.6.2-3.2V5.5c0-1.6-.2-3.2-.2-3.2zM7.2 9V4l4.9 2.5L7.2 9z"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, letterSpacing: '0.04em' }}>
          YOUTUBE TUTORIALS
        </span>
        {loading && (
          <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: '#FF0000', animation: 'spin 0.8s linear infinite' }} />
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: t.textTertiary, padding: '8px 12px', borderRadius: 8, background: t.bgSecondary }}>
          {error}
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {videos.map((v) => <YouTubeCard key={v.videoId} video={v} t={t} />)}
        </div>
      )}
    </div>
  );
}

// ── Main LearningPlan component ────────────────────────────────────────────────
export default function LearningPlan({ plan, t }) {
  if (!plan) return null;

  // Fallback theme if t not provided
  if (!t) t = {
    text: '#1C1A17', textSecondary: '#6B6760', textTertiary: '#A8A49D',
    bgCard: '#FFF', bgSecondary: '#EDEAE3', bgTertiary: '#E4E0D7',
    border: '#DDD9D0', purple: '#5B4FE8', purpleLight: '#EEF0FD', purpleText: '#3730A3',
    green: '#1A7A4A', greenLight: '#E8F5EE',
    red: '#C23B22', redLight: '#FEE8E4',
    amber: '#B45309', amberLight: '#FEF3C7',
    shadow: '0 1px 3px rgba(0,0,0,0.08)',
    isDark: false,
  };

  const priorityStyle = (p) => {
    if (p === 'critical') return { bg: t.redLight,    color: t.red };
    if (p === 'moderate') return { bg: t.amberLight,  color: t.amber };
    return                       { bg: t.bgSecondary, color: t.textSecondary };
  };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, border: `1px solid ${t.green}40`, background: t.greenLight, marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.green, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: t.green, fontWeight: 700, letterSpacing: '0.06em' }}>PERSONALIZED LEARNING PLAN</span>
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10, color: t.text, fontFamily: "'Syne',sans-serif" }}>
          Your path to role-ready
        </h2>
        <p style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.65, marginBottom: 14 }}>{plan.overview}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: t.purpleLight, border: `1px solid ${t.purple}30` }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <span style={{ fontSize: 13, color: t.purpleText }}>
            Estimated time to role-ready: <strong>{plan.time_to_ready_weeks} weeks</strong>
          </span>
        </div>
      </div>

      {/* Learning paths */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {plan.learning_paths?.map((path, i) => {
          const ps = priorityStyle(path.priority);
          return (
            <div key={i} style={{
              borderRadius: 14, border: `1px solid ${t.border}`,
              background: t.bgCard, overflow: 'hidden', boxShadow: t.shadow,
              transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = t.shadow}
            >
              {/* Card header */}
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, background: t.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: t.textSecondary }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: t.text, fontFamily: "'Syne',sans-serif", letterSpacing: '-0.01em' }}>{path.skill}</div>
                    <div style={{ fontSize: 11, color: t.textTertiary, marginTop: 1 }}>{path.current_level} → {path.target_level}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: ps.bg, color: ps.color, fontWeight: 600 }}>{path.priority}</span>
                  <span style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>~{path.weeks_estimate}w</span>
                </div>
              </div>

              <div style={{ padding: '14px 18px' }}>
                <p style={{ fontSize: 13, color: t.textSecondary, fontStyle: 'italic', marginBottom: 14, lineHeight: 1.55 }}>{path.why}</p>

                {/* Curated resources */}
                {path.resources?.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.textTertiary, letterSpacing: '0.04em', marginBottom: 8 }}>CURATED RESOURCES</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {path.resources.map((res, j) => (
                        <a key={j} href={res.url} target="_blank" rel="noopener noreferrer" style={{
                          display: 'flex', gap: 12, padding: '11px 14px', borderRadius: 10,
                          border: `1px solid ${t.border}`, background: t.bgSecondary,
                          textDecoration: 'none', color: 'inherit', transition: 'all 0.15s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = t.purple; e.currentTarget.style.background = t.purpleLight; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.bgSecondary; }}
                        >
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICON[res.type] || '📌'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: t.text, marginBottom: 2 }}>{res.title}</div>
                            <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.4 }}>{res.action}</div>
                          </div>
                          <div style={{ fontSize: 11, color: t.textTertiary, flexShrink: 0, alignSelf: 'center', fontFamily: "'JetBrains Mono',monospace" }}>~{res.hours}h</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* YouTube videos — live from API */}
                <YouTubeSection skill={path.skill} level={path.current_level || 'beginner'} t={t} />

                {path.bridge_skill && (
                  <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 8, background: t.greenLight, border: `1px solid ${t.green}30`, fontSize: 12, color: t.green, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>→</span>
                    After this, learn <strong>{path.bridge_skill}</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
