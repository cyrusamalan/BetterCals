'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  FileText,
  ArrowRight,
  RotateCcw,
  Activity,
  HeartPulse,
  Droplets,
  Zap,
} from 'lucide-react';

/* ─── Animated cursor SVG ─── */
function AnimCursor({ clicking }: { clicking: boolean }) {
  return (
    <svg
      width="20" height="24" viewBox="0 0 20 24"
      style={{
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
        transform: clicking ? 'scale(0.8)' : 'scale(1)',
        transition: 'transform 0.1s ease',
      }}
    >
      <path
        d="M3 2L3 18.5L7.5 14.5L11.5 22L14 21L10 13L16 12.5L3 2Z"
        fill="white"
        stroke="#222"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Timeline phases ─── */
// Desktop: 2-column grid, cursor goes left-col then right-col then bottom
const DESKTOP_PHASES = [
  { dur: 500,  cx: 50, cy: 5,  click: false },  // 0: appear
  { dur: 450,  cx: 42, cy: 18, click: false },  // 1: → age
  { dur: 750,  cx: 42, cy: 18, click: true  },  // 2: fill age
  { dur: 400,  cx: 42, cy: 30, click: false },  // 3: → height
  { dur: 600,  cx: 42, cy: 30, click: true  },  // 4: fill height
  { dur: 400,  cx: 42, cy: 42, click: false },  // 5: → weight
  { dur: 600,  cx: 42, cy: 42, click: true  },  // 6: fill weight
  { dur: 400,  cx: 90, cy: 18, click: false },  // 7: → activity (right col)
  { dur: 600,  cx: 90, cy: 18, click: true  },  // 8: fill activity
  { dur: 550,  cx: 50, cy: 62, click: false },  // 9: → upload
  { dur: 1300, cx: 50, cy: 62, click: true  },  // 10: upload file
  { dur: 500,  cx: 50, cy: 82, click: false },  // 11: → analyze btn
  { dur: 200,  cx: 50, cy: 82, click: true  },  // 12: click analyze
  { dur: 1300, cx: 50, cy: 82, click: false },  // 13: loading
  { dur: 4000, cx: 50, cy: 45, click: false },  // 14: results
];

// Mobile: single-column, cursor goes straight down
const MOBILE_PHASES = [
  { dur: 500,  cx: 50, cy: 3,  click: false },  // 0: appear
  { dur: 450,  cx: 75, cy: 12, click: false },  // 1: → age
  { dur: 750,  cx: 75, cy: 12, click: true  },  // 2: fill age
  { dur: 400,  cx: 75, cy: 19, click: false },  // 3: → height
  { dur: 600,  cx: 75, cy: 19, click: true  },  // 4: fill height
  { dur: 400,  cx: 75, cy: 26, click: false },  // 5: → weight
  { dur: 600,  cx: 75, cy: 26, click: true  },  // 6: fill weight
  { dur: 400,  cx: 75, cy: 33, click: false },  // 7: → activity
  { dur: 600,  cx: 75, cy: 33, click: true  },  // 8: fill activity
  { dur: 550,  cx: 50, cy: 55, click: false },  // 9: → upload
  { dur: 1300, cx: 50, cy: 55, click: true  },  // 10: upload file
  { dur: 500,  cx: 50, cy: 78, click: false },  // 11: → analyze btn
  { dur: 200,  cx: 50, cy: 78, click: true  },  // 12: click analyze
  { dur: 1300, cx: 50, cy: 78, click: false },  // 13: loading
  { dur: 4000, cx: 50, cy: 40, click: false },  // 14: results
];

/* ─── useIsMobile hook ─── */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

/* ─── Mini form field ─── */
function MiniField({ label, value, active }: {
  label: string; value: string; active: boolean;
}) {
  const filled = value.length > 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '4px 10px',
      borderRadius: '8px', height: '28px',
      border: `1.5px solid ${active ? 'var(--accent)' : filled ? 'var(--border)' : 'var(--border-light)'}`,
      background: active ? 'var(--accent-subtle)' : 'var(--surface)',
      boxShadow: active ? '0 0 0 2px rgba(107, 143, 113, 0.1)' : 'none',
      transition: 'all 0.2s ease',
    }}>
      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', width: '48px', flexShrink: 0, fontWeight: 500 }}>
        {label}
      </span>
      <span style={{
        fontSize: '11px', fontWeight: 600,
        color: filled ? 'var(--text-primary)' : 'var(--text-tertiary)',
        opacity: filled ? 1 : 0.3,
        transform: filled ? 'translateX(0)' : 'translateX(6px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {filled ? value : '—'}
      </span>
    </div>
  );
}

/* ─── Score ring (results) ─── */
function MiniScoreRing({ animate, size = 100 }: { animate: boolean; size?: number }) {
  const stroke = size > 80 ? 7 : 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const progress = animate ? (82 / 100) * circ : 0;
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - progress}
          style={{ transition: animate ? 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}
        />
      </svg>
      <div style={{
        position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: animate ? 1 : 0, transform: animate ? 'scale(1)' : 'scale(0.7)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
      }}>
        <span style={{ fontSize: size > 80 ? '18px' : '16px', fontWeight: 700, color: 'var(--accent)' }}>82</span>
        <span style={{ fontSize: size > 80 ? '8px' : '7px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Health Score</span>
      </div>
    </div>
  );
}

/* ─── Marker data ─── */
const MARKERS = [
  { name: 'Total Cholesterol', val: '195', unit: 'mg/dL', status: 'normal', icon: Droplets },
  { name: 'HbA1c', val: '5.4', unit: '%', status: 'normal', icon: Activity },
  { name: 'LDL', val: '138', unit: 'mg/dL', status: 'warning', icon: HeartPulse },
  { name: 'TDEE', val: '2,240', unit: 'kcal', status: 'info', icon: Zap },
] as const;

const SC: Record<string, string> = { normal: 'var(--status-normal)', warning: 'var(--status-warning)', info: 'var(--status-info)' };
const SB: Record<string, string> = { normal: 'var(--status-normal-bg)', warning: 'var(--status-warning-bg)', info: 'var(--status-info-bg)' };

function MiniMarker({ m, show, delay, compact }: { m: typeof MARKERS[number]; show: boolean; delay: number; compact?: boolean }) {
  const Icon = m.icon;
  const pad = compact ? '5px 8px' : '7px 12px';
  const iconSz = compact ? 10 : 12;
  const iconBox = compact ? 18 : 22;
  const fontSize = compact ? '10px' : '12px';
  const valSize = compact ? '10px' : '12px';
  const unitSize = compact ? '8px' : '10px';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
      padding: pad, borderRadius: compact ? '8px' : '10px',
      background: 'var(--bg-warm)', border: '1px solid var(--border-light)',
      opacity: show ? 1 : 0, transform: show ? 'translateX(0)' : 'translateX(12px)',
      transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '5px' : '8px' }}>
        <div style={{
          width: iconBox, height: iconBox, borderRadius: compact ? '5px' : '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: SB[m.status],
        }}>
          <Icon size={iconSz} style={{ color: SC[m.status] }} />
        </div>
        <span style={{ fontSize, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '2px' : '4px', flexShrink: 0 }}>
        <span style={{ fontSize: valSize, fontWeight: 600, color: SC[m.status] }}>{m.val}</span>
        <span style={{ fontSize: unitSize, color: 'var(--text-tertiary)' }}>{m.unit}</span>
      </div>
    </div>
  );
}

/* ─── Form view ─── */
function FormView({ phase, mobile }: { phase: number; mobile: boolean }) {
  const age = phase >= 2 ? '32' : '';
  const height = phase >= 4 ? "5'10\"" : '';
  const weight = phase >= 6 ? '172 lbs' : '';
  const activity = phase >= 8 ? 'Moderate' : '';
  const af =
    phase <= 2 && phase >= 1 ? 'age' :
    phase <= 4 && phase >= 3 ? 'height' :
    phase <= 6 && phase >= 5 ? 'weight' :
    phase <= 8 && phase >= 7 ? 'activity' : null;
  const uploadActive = phase === 9 || phase === 10;
  const uploadDone = phase >= 10;
  const analyzeActive = phase === 11 || phase === 12;
  const analyzing = phase === 13;

  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: mobile ? '5px' : '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '13px' }}>📝</span> Your Profile
      </div>

      {/* Grid: 2-col on desktop, 1-col on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
        gap: mobile ? '3px' : '5px 12px',
        marginBottom: mobile ? '10px' : '16px',
      }}>
        {mobile ? (
          // Single column order for mobile cursor path
          <>
            <MiniField label="Age" value={age} active={af === 'age'} />
            <MiniField label="Height" value={height} active={af === 'height'} />
            <MiniField label="Weight" value={weight} active={af === 'weight'} />
            <MiniField label="Activity" value={activity} active={af === 'activity'} />
            <MiniField label="Goal" value="Maintain" active={false} />
          </>
        ) : (
          // 2-column desktop order
          <>
            <MiniField label="Age" value={age} active={af === 'age'} />
            <MiniField label="Activity" value={activity} active={af === 'activity'} />
            <MiniField label="Height" value={height} active={af === 'height'} />
            <MiniField label="Goal" value="Maintain" active={false} />
            <MiniField label="Weight" value={weight} active={af === 'weight'} />
          </>
        )}
      </div>

      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '13px' }}>📄</span> Lab Results
      </div>
      <div style={{
        border: `1.5px dashed ${uploadActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '10px', padding: uploadDone ? '6px 10px' : (mobile ? '10px' : '14px 14px'),
        textAlign: 'center',
        background: uploadActive ? 'var(--accent-subtle)' : 'var(--bg-warm)',
        transition: 'all 0.3s ease', marginBottom: mobile ? '10px' : '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px',
      }}>
        {!uploadDone ? (
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Drop file or click to upload</span>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={11} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-primary)' }}>blood_panel_2026.pdf</span>
              <Check size={10} style={{ color: 'var(--status-normal)' }} />
            </div>
            <div style={{ width: '60%', height: '3px', borderRadius: '2px', background: 'var(--border-light)', overflow: 'hidden' }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '2px',
                background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: mobile ? '7px 20px' : '8px 28px', borderRadius: mobile ? '10px' : '12px',
          fontSize: mobile ? '11px' : '12px', fontWeight: 600,
          color: 'var(--text-inverse)',
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
          boxShadow: analyzeActive ? '0 4px 16px rgba(107, 143, 113, 0.35)' : '0 2px 8px rgba(107, 143, 113, 0.2)',
          transform: analyzeActive ? 'scale(0.95)' : 'scale(1)',
          transition: 'all 0.15s ease',
        }}>
          {analyzing ? (
            <>
              <div style={{
                width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white', borderRadius: '50%',
                animation: 'demoSpin 0.6s linear infinite',
              }} />
              Analyzing...
            </>
          ) : (
            <>Analyze My Health <ArrowRight size={12} /></>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Results view ─── */
function ResultsView({ animate, mobile }: { animate: boolean; mobile: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: mobile ? '8px' : '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '13px' }}>✨</span> Your Results
      </div>
      {mobile ? (
        // Stacked: score ring on top, markers below
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <MiniScoreRing animate={animate} size={76} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {MARKERS.map((m, i) => (
              <MiniMarker key={m.name} m={m} show={animate} delay={0.5 + i * 0.1} compact />
            ))}
          </div>
        </div>
      ) : (
        // Side-by-side on desktop
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <MiniScoreRing animate={animate} size={100} />
            <span style={{
              fontSize: '9px', fontWeight: 500, color: 'var(--text-tertiary)',
              opacity: animate ? 1 : 0, transition: 'opacity 0.4s ease 1s',
            }}>Overall health assessment</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {MARKERS.map((m, i) => (
              <MiniMarker key={m.name} m={m} show={animate} delay={0.5 + i * 0.12} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   DemoModal (public API)
   ═══════════════════════════════════════ */
export default function DemoModal({ open, onCloseAction }: { open: boolean; onCloseAction: () => void }) {
  if (!open) return null;
  return <DemoWindow onCloseAction={onCloseAction} />;
}

/* ─── Demo window (inner, remounts each open) ─── */
function DemoWindow({ onCloseAction }: { onCloseAction: () => void }) {
  const [phase, setPhase] = useState(0);
  const mobile = useIsMobile();
  const done = phase >= DESKTOP_PHASES.length - 1;

  const phases = mobile ? MOBILE_PHASES : DESKTOP_PHASES;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setPhase(p => p + 1), phases[phase].dur);
    return () => clearTimeout(t);
  }, [phase, done, phases]);

  const replay = useCallback(() => { setPhase(0); }, []);

  const cur = phases[Math.min(phase, phases.length - 1)];
  const showResults = phase >= 14;
  const cursorVisible = phase > 0 && phase < 14;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.25s ease both',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: mobile ? '8px' : '16px',
        }}
        onClick={onCloseAction}
      />

      {/* Browser window */}
      <div
        className="fixed z-50"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: mobile ? '96vw' : '92vw',
          maxWidth: mobile ? '400px' : '720px',
          maxHeight: mobile ? '88vh' : '90vh',
          borderRadius: mobile ? '12px' : '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* ── Title bar ── */}
        <div style={{
          background: 'linear-gradient(180deg, #3a3a3c 0%, #2c2c2e 100%)',
          padding: mobile ? '8px 10px' : '9px 14px',
          display: 'flex', alignItems: 'center', gap: '8px',
          borderBottom: '1px solid rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button onClick={onCloseAction} aria-label="Close" style={{
              width: 12, height: 12, borderRadius: '50%', background: '#ff5f57',
              border: '0.5px solid rgba(0,0,0,0.12)', cursor: 'pointer',
            }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', border: '0.5px solid rgba(0,0,0,0.12)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', border: '0.5px solid rgba(0,0,0,0.12)' }} />
          </div>
          <div style={{
            flex: 1, background: 'rgba(0,0,0,0.25)', borderRadius: '6px',
            padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px',
            overflow: 'hidden',
          }}>
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" style={{ flexShrink: 0 }}>
              <path d="M5 1.5C3.067 1.5 1.5 3.067 1.5 5v1.5c0 .828.672 1.5 1.5 1.5h4c.828 0 1.5-.672 1.5-1.5V5c0-1.933-1.567-3.5-3.5-3.5z" stroke="#888" strokeWidth="1" />
              <rect x="0.5" y="5" width="9" height="6" rx="1.5" stroke="#888" strokeWidth="1" />
            </svg>
            <span style={{
              fontSize: mobile ? '10px' : '11px', color: '#999',
              fontFamily: '-apple-system, system-ui, sans-serif',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              bettercals.com/analyze
            </span>
          </div>
          <button onClick={onCloseAction} aria-label="Close modal" style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={14} color="#888" />
          </button>
        </div>

        {/* ── Content area ── */}
        <div style={{
          position: 'relative', background: 'var(--bg-primary)',
          height: mobile ? '380px' : '340px',
          overflow: 'hidden', flex: '1 1 auto',
        }}>
          {/* Cursor */}
          <div style={{
            position: 'absolute', left: `${cur.cx}%`, top: `${cur.cy}%`, zIndex: 10,
            pointerEvents: 'none',
            opacity: cursorVisible ? 1 : 0,
            transition: 'left 0.35s cubic-bezier(0.4,0,0.2,1), top 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
          }}>
            <AnimCursor clicking={cur.click} />
            {cur.click && (
              <div style={{
                position: 'absolute', top: 2, left: 2, width: 22, height: 22,
                borderRadius: '50%', background: 'rgba(107,143,113,0.2)',
                animation: 'scaleIn 0.3s ease-out',
                pointerEvents: 'none',
              }} />
            )}
          </div>

          {/* Form view */}
          <div style={{
            position: 'absolute', inset: 0, padding: mobile ? '10px 14px' : '14px 20px',
            opacity: showResults ? 0 : 1,
            transform: showResults ? 'translateY(-16px)' : 'translateY(0)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
          }}>
            <FormView phase={phase} mobile={mobile} />
          </div>

          {/* Results view */}
          <div style={{
            position: 'absolute', inset: 0, padding: mobile ? '10px 14px' : '14px 20px',
            opacity: showResults ? 1 : 0,
            transform: showResults ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
            pointerEvents: 'none',
          }}>
            <ResultsView animate={showResults} mobile={mobile} />
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          background: 'var(--surface)', borderTop: '1px solid var(--border-light)',
          padding: mobile ? '8px 12px' : '8px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: '8px',
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            {showResults ? '✨ Analysis complete' : '● Recording demo...'}
          </span>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {done && (
              <button onClick={replay} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: mobile ? '6px 10px' : '4px 10px',
                borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                background: 'var(--bg-warm)', border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
                <RotateCcw size={10} /> Replay
              </button>
            )}
            <button onClick={onCloseAction} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: mobile ? '6px 12px' : '4px 12px',
              borderRadius: '8px', fontSize: '10px', fontWeight: 600,
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: 'var(--text-inverse)', border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(107,143,113,0.2)',
            }}>
              Try it yourself <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Inline keyframes for spinner */}
      <style>{`
        @keyframes demoSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
