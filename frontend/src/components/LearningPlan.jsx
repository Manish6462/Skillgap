import React from 'react';

const TYPE_ICON = { course:'🎓', tutorials:'📖', project:'🔨', docs:'📄', interactive:'⚡' };

export default function LearningPlan({ plan, t }) {
  if (!plan) return null;
  if (!t) t = {
    text:'#1C1A17', textSecondary:'#6B6760', textTertiary:'#A8A49D',
    bgCard:'#FFF', bgSecondary:'#EDEAE3', bgTertiary:'#E4E0D7',
    border:'#DDD9D0', purple:'#5B4FE8', purpleLight:'#EEF0FD', purpleText:'#3730A3',
    green:'#1A7A4A', greenLight:'#E8F5EE',
    red:'#C23B22', redLight:'#FEE8E4',
    amber:'#B45309', amberLight:'#FEF3C7',
    shadow:'0 1px 3px rgba(0,0,0,0.08)',
  };

  const priorityStyle = (p) => {
    if (p==='critical') return { bg:t.redLight, color:t.red };
    if (p==='moderate') return { bg:t.amberLight, color:t.amber };
    return { bg:t.bgSecondary, color:t.textSecondary };
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20, border:`1px solid ${t.green}40`, background:t.greenLight, marginBottom:14 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:t.green, display:'inline-block' }} />
          <span style={{ fontSize:11, color:t.green, fontWeight:700, letterSpacing:'0.06em' }}>PERSONALIZED LEARNING PLAN</span>
        </div>
        <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.03em', marginBottom:10, color:t.text, fontFamily:"'Syne',sans-serif" }}>
          Your path to role-ready
        </h2>
        <p style={{ fontSize:14, color:t.textSecondary, lineHeight:1.65, marginBottom:14 }}>{plan.overview}</p>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, background:t.purpleLight, border:`1px solid ${t.purple}30` }}>
          <span style={{ fontSize:16 }}>📅</span>
          <span style={{ fontSize:13, color:t.purpleText }}>Estimated time to role-ready: <strong>{plan.time_to_ready_weeks} weeks</strong></span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {plan.learning_paths?.map((path, i) => {
          const ps = priorityStyle(path.priority);
          return (
            <div key={i} style={{ borderRadius:14, border:`1px solid ${t.border}`, background:t.bgCard, overflow:'hidden', boxShadow:t.shadow, transition:'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow=`0 4px 20px rgba(0,0,0,0.1)`}
              onMouseLeave={e => e.currentTarget.style.boxShadow=t.shadow}
            >
              {/* Card header */}
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${t.border}`, background:t.bgSecondary, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:t.bgTertiary, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:t.textSecondary }}>
                    {i+1}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:t.text, fontFamily:"'Syne',sans-serif", letterSpacing:'-0.01em' }}>{path.skill}</div>
                    <div style={{ fontSize:11, color:t.textTertiary, marginTop:1 }}>{path.current_level} → {path.target_level}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:11, padding:'3px 9px', borderRadius:6, background:ps.bg, color:ps.color, fontWeight:600 }}>{path.priority}</span>
                  <span style={{ fontSize:12, color:t.textSecondary, fontWeight:500 }}>~{path.weeks_estimate}w</span>
                </div>
              </div>

              <div style={{ padding:'14px 18px' }}>
                <p style={{ fontSize:13, color:t.textSecondary, fontStyle:'italic', marginBottom:14, lineHeight:1.55 }}>{path.why}</p>

                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {path.resources?.map((res, j) => (
                    <a key={j} href={res.url} target="_blank" rel="noopener noreferrer" style={{
                      display:'flex', gap:12, padding:'11px 14px', borderRadius:10,
                      border:`1px solid ${t.border}`, background:t.bgSecondary,
                      textDecoration:'none', color:'inherit', transition:'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=t.purple; e.currentTarget.style.background=t.purpleLight; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.bgSecondary; }}
                    >
                      <span style={{ fontSize:20, flexShrink:0 }}>{TYPE_ICON[res.type]||'📌'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:t.text, marginBottom:2 }}>{res.title}</div>
                        <div style={{ fontSize:12, color:t.textSecondary, lineHeight:1.4 }}>{res.action}</div>
                      </div>
                      <div style={{ fontSize:11, color:t.textTertiary, flexShrink:0, alignSelf:'center', fontFamily:"'JetBrains Mono',monospace" }}>~{res.hours}h</div>
                    </a>
                  ))}
                </div>

                {path.bridge_skill && (
                  <div style={{ marginTop:12, padding:'8px 12px', borderRadius:8, background:t.greenLight, border:`1px solid ${t.green}30`, fontSize:12, color:t.green, display:'flex', alignItems:'center', gap:6 }}>
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
