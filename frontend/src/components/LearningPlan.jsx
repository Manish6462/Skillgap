import React from 'react';

const TYPE_ICON = {
  course: '🎓', tutorials: '📖', project: '🔨',
  docs: '📄', interactive: '⚡',
};

const PRIORITY_COLOR = {
  critical: { bg: '#fff0ee', text: '#7a2510' },
  moderate: { bg: '#faf3e0', text: '#5c3d0a' },
  minor:    { bg: '#e8f5fe', text: '#0c3e6e' },
};

export default function LearningPlan({ plan }) {
  if (!plan) return null;

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 6 }}>Your learning plan</div>
        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{plan.overview}</div>
        <div style={{
          marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 8, background: '#f5f4ff', color: '#534AB7', fontSize: 13
        }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <span>Estimated time to role-ready: <strong>{plan.time_to_ready_weeks} weeks</strong></span>
        </div>
      </div>

      {plan.learning_paths?.map((path, i) => {
        const pc = PRIORITY_COLOR[path.priority] || PRIORITY_COLOR.minor;
        return (
          <div key={i} style={{
            marginBottom: 20, padding: '16px 18px',
            borderRadius: 10, border: '0.5px solid #e0ddd8', background: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 500, fontSize: 15 }}>{path.skill}</span>
                <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                  {path.current_level} → {path.target_level}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, padding: '2px 7px', borderRadius: 4,
                  background: pc.bg, color: pc.text, fontWeight: 500
                }}>{path.priority}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{path.weeks_estimate}w</span>
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#555', marginBottom: 12, fontStyle: 'italic' }}>
              {path.why}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {path.resources?.map((res, j) => (
                <a
                  key={j}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', gap: 10, padding: '10px 12px',
                    borderRadius: 7, border: '0.5px solid #eee',
                    background: '#fafaf9', textDecoration: 'none', color: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#534AB7'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#eee'}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {TYPE_ICON[res.type] || '📌'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: '#1a1a1a' }}>{res.title}</div>
                    <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{res.action}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', flexShrink: 0, alignSelf: 'center' }}>
                    ~{res.hours}h
                  </div>
                </a>
              ))}
            </div>

            {path.bridge_skill && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
                After this → learn <strong style={{ color: '#0F6E56' }}>{path.bridge_skill}</strong>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
