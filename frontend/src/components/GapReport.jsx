import React from 'react';

const SEVERITY = {
  critical: { dot: '#E5533A', label: 'critical' },
  moderate: { dot: '#D4900A', label: 'moderate' },
  minor:    { dot: '#4A90D9', label: 'minor' },
  none:     { dot: '#4CAF82', label: 'none' },
};
const LEVEL_W = { none:0, beginner:18, intermediate:44, advanced:70, expert:94 };

export default function GapReport({ gaps, assessments, skillsToAssess, onStartAssessment, activeSkill, t }) {
  if (!gaps || gaps.length === 0) return null;

  const getBg = (severity) => {
    if (severity === 'critical') return t.redLight;
    if (severity === 'moderate') return t.amberLight;
    if (severity === 'none') return t.greenLight;
    return t.bgSecondary;
  };
  const getTextColor = (severity) => {
    if (severity === 'critical') return t.red;
    if (severity === 'moderate') return t.amber;
    if (severity === 'none') return t.green;
    return t.textSecondary;
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {gaps.map((gap) => {
        const sv = SEVERITY[gap.severity] || SEVERITY.minor;
        const assessed = assessments?.[gap.skill];
        const isActive = activeSkill === gap.skill;
        const canAssess = skillsToAssess?.includes(gap.skill) && !assessed && gap.severity !== 'none';

        return (
          <div key={gap.skill} style={{
            padding: '12px 14px', borderRadius: 10,
            border: `1px solid ${isActive ? t.purple : t.border}`,
            background: isActive ? t.purpleLight : t.bgCard,
            transition: 'border-color 0.15s, background 0.15s',
            boxShadow: t.shadow,
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:sv.dot, display:'inline-block', flexShrink:0 }} />
                <span style={{ fontWeight:600, fontSize:13, color:t.text }}>{gap.skill}</span>
                {gap.priority === 'must-have' && (
                  <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:t.purpleLight, color:t.purpleText, fontWeight:600 }}>MUST-HAVE</span>
                )}
              </div>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background:getBg(gap.severity), color:getTextColor(gap.severity), fontWeight:600, letterSpacing:'0.02em' }}>
                {sv.label}
              </span>
            </div>

            {/* Level bar */}
            <div style={{ marginBottom: canAssess || assessed ? 8 : 0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:t.textTertiary, marginBottom:4 }}>
                <span>candidate: <strong style={{ color:t.textSecondary }}>{assessed ? assessed.verified_level : gap.candidate_level}</strong></span>
                <span>required: <strong style={{ color:t.textSecondary }}>{gap.required_level}</strong></span>
              </div>
              <div style={{ height:5, borderRadius:3, background:t.bgTertiary, position:'relative', overflow:'visible' }}>
                <div style={{ position:'absolute', left:`${LEVEL_W[gap.required_level]||50}%`, top:-2, width:2, height:9, background:t.red, borderRadius:1 }} />
                <div style={{ height:'100%', borderRadius:3, background:assessed?t.purple:t.textTertiary, width:`${LEVEL_W[assessed?assessed.verified_level:gap.candidate_level]||0}%`, transition:'width 0.5s ease' }} />
              </div>
            </div>

            {assessed && (
              <div style={{ fontSize:11, color:t.textSecondary, fontStyle:'italic', marginBottom:6, lineHeight:1.5 }}>
                "{assessed.summary}"
              </div>
            )}

            {canAssess && (
              <button onClick={() => onStartAssessment(gap.skill)} style={{ fontSize:11, padding:'4px 11px', borderRadius:6, border:`1px solid ${t.purple}`, background:'transparent', color:t.purple, fontWeight:600, transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background=t.purpleLight; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; }}
              >
                Assess ↗
              </button>
            )}
            {assessed && (
              <div style={{ fontSize:11, color:t.green, fontWeight:500 }}>✓ Score: {assessed.score}/5</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
