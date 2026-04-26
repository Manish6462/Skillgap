import React from 'react';

const SEVERITY_COLOR = {
  critical: { bg: '#fff0ee', text: '#7a2510', dot: '#d85a30' },
  moderate:  { bg: '#faf3e0', text: '#5c3d0a', dot: '#ba7517' },
  minor:     { bg: '#e8f5fe', text: '#0c3e6e', dot: '#378add' },
  none:      { bg: '#eaf3de', text: '#1e4a08', dot: '#639922' },
};

const LEVEL_WIDTH = { none: 0, beginner: 20, intermediate: 45, advanced: 70, expert: 95 };

export default function GapReport({ gaps, assessments, skillsToAssess, onStartAssessment, activeSkill }) {
  if (!gaps || gaps.length === 0) return null;

  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 12, color: '#1a1a1a' }}>
        Skill gap report
      </div>

      {gaps.map((gap) => {
        const colors = SEVERITY_COLOR[gap.severity] || SEVERITY_COLOR.minor;
        const assessed = assessments?.[gap.skill];
        const isActive = activeSkill === gap.skill;
        const canAssess = skillsToAssess?.includes(gap.skill) && !assessed && gap.severity !== 'none';

        return (
          <div
            key={gap.skill}
            style={{
              marginBottom: 8,
              padding: '10px 12px',
              borderRadius: 8,
              border: isActive ? '1.5px solid #534AB7' : '0.5px solid #e0ddd8',
              background: isActive ? '#f5f4ff' : '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: colors.dot, flexShrink: 0, display: 'inline-block'
                }} />
                <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{gap.skill}</span>
                {gap.priority === 'must-have' && (
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f5f4ff', color: '#534AB7' }}>
                    must-have
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 11, padding: '2px 7px', borderRadius: 4,
                background: colors.bg, color: colors.text, fontWeight: 500
              }}>
                {gap.severity}
              </span>
            </div>

            {/* Level bar */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 3 }}>
                <span>candidate: {assessed ? assessed.verified_level : gap.candidate_level}</span>
                <span>required: {gap.required_level}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: '#f0ede8', position: 'relative' }}>
                {/* Required level marker */}
                <div style={{
                  position: 'absolute',
                  left: `${LEVEL_WIDTH[gap.required_level] || 50}%`,
                  top: -2, width: 2, height: 8, background: '#d85a30', borderRadius: 1
                }} />
                {/* Candidate level bar */}
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: assessed ? '#534AB7' : '#b4b2a9',
                  width: `${LEVEL_WIDTH[assessed ? assessed.verified_level : gap.candidate_level] || 0}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {assessed && (
              <div style={{ fontSize: 11, color: '#555', marginBottom: 4, fontStyle: 'italic' }}>
                "{assessed.summary}"
              </div>
            )}

            {canAssess && (
              <button
                onClick={() => onStartAssessment(gap.skill)}
                style={{
                  marginTop: 4, fontSize: 11, padding: '3px 10px',
                  borderRadius: 5, border: '0.5px solid #534AB7',
                  background: 'transparent', color: '#534AB7', cursor: 'pointer'
                }}
              >
                Assess this skill ↗
              </button>
            )}

            {assessed && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#639922' }}>
                ✓ Assessed — score {assessed.score}/5
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
