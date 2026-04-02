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
const PHASES = [
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
] as const;

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
function MiniScoreRing({ animate }: { animate: boolean }) {
  const size = 100, stroke = 7, radius = (size - stroke) / 2;
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
        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>82</span>
        <span style={{ fontSize: '8px', fontWeight: 500, color: 'var(--text-tertiary)' }}>Health Score</span>
      </div>
    </div>
  );
}

/* ─── Marker row (results) ─── */
const MARKERS = [
  { name: 'Total Cholesterol', val: '195', unit: 'mg/dL', status: 'normal', icon: Droplets },
  { name: 'HbA1c', val: '5.4', unit: '%', status: 'normal', icon: Activity },
  { name: 'LDL', val: '138', unit: 'mg/dL', status: 'warning', icon: HeartPulse },
  { name: 'TDEE', val: '2,240', unit: 'kcal', status: 'info', icon: Zap },
] as const;

const SC: Record<string, string> = { normal: 'var(--status-normal)', warning: 'var(--status-warning)', info: 'var(--status-info)' };
const SB: Record<string, string> = { normal: 'var(--status-normal-bg)', warning: 'var(--status-warning-bg)', info: 'var(--status-info-bg)' };

function MiniMarker({ m, show, delay }: { m: typeof MARKERS[number]; show: boolean; delay: number }) {
  const Icon = m.icon;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
      padding: '7px 12px', borderRadius: '10px',
      background: 'var(--bg-warm)', border: '1px solid var(--border-light)',
      opacity: show ? 1 : 0, transform: show ? 'translateX(0)' : 'translateX(12px)',
      transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: 22, height: 22, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: SB[m.status],
        }}>
          <Icon size={12} style={{ color: SC[m.status] }} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: SC[m.status] }}>{m.val}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{m.unit}</span>
      </div>
    </div>
  );
}

/* ─── Form view ─── */
function FormView({ phase }: { phase: number }) {
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
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '13px' }}>📝</span> Your Profile
      </div>

      {/* 2-column grid for fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px', marginBottom: '16px' }}>
        <MiniField label="Age" value={age} active={af === 'age'} />
        <MiniField label="Activity" value={activity} active={af === 'activity'} />
        <MiniField label="Height" value={height} active={af === 'height'} />
        <MiniField label="Goal" value="Maintain" active={false} />
        <MiniField label="Weight" value={weight} active={af === 'weight'} />
      </div>

      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '13px' }}>📄</span> Lab Results
      </div>
      <div style={{
        border: `1.5px dashed ${uploadActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '10px', padding: uploadDone ? '8px 14px' : '14px 14px', textAlign: 'center',
        background: uploadActive ? 'var(--accent-subtle)' : 'var(--bg-warm)',
        transition: 'all 0.3s ease', marginBottom: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '5px',
      }}>
        {!uploadDone ? (
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Drop file or click to upload</span>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={12} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}>blood_panel_2026.pdf</span>
              <Check size={11} style={{ color: 'var(--status-normal)' }} />
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
          padding: '8px 28px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
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
function ResultsView({ animate }: { animate: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '13px' }}>✨</span> Your Results
      </div>
      {/* Side-by-side: score ring + markers */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <MiniScoreRing animate={animate} />
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
  const done = phase >= PHASES.length - 1;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setPhase(p => p + 1), PHASES[phase].dur);
    return () => clearTimeout(t);
  }, [phase, done]);

  const replay = useCallback(() => { setPhase(0); }, []);

  const cur = PHASES[Math.min(phase, PHASES.length - 1)];
  const showResults = phase >= 14;
  const cursorVisible = phase > 0 && phase < 14;

  return (
    <>
      {/* Backdrop + centering wrapper */}
      <div
        className="fixed inset-0 z-50"
        style={{
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.25s ease both',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onCloseAction}
      />

      {/* Browser window */}
      <div
        className="fixed z-50"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '92vw', maxWidth: '720px',
          borderRadius: '16px', overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* ── Title bar ── */}
        <div style={{
          background: 'linear-gradient(180deg, #3a3a3c 0%, #2c2c2e 100%)',
          padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '8px',
          borderBottom: '1px solid rgba(0,0,0,0.3)',
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
          }}>
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
              <path d="M5 1.5C3.067 1.5 1.5 3.067 1.5 5v1.5c0 .828.672 1.5 1.5 1.5h4c.828 0 1.5-.672 1.5-1.5V5c0-1.933-1.567-3.5-3.5-3.5z" stroke="#888" strokeWidth="1" />
              <rect x="0.5" y="5" width="9" height="6" rx="1.5" stroke="#888" strokeWidth="1" />
            </svg>
            <span style={{ fontSize: '11px', color: '#999', fontFamily: '-apple-system, system-ui, sans-serif' }}>
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
        <div style={{ position: 'relative', background: 'var(--bg-primary)', height: '340px', overflow: 'hidden' }}>
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
            position: 'absolute', inset: 0, padding: '14px 20px',
            opacity: showResults ? 0 : 1,
            transform: showResults ? 'translateY(-16px)' : 'translateY(0)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
          }}>
            <FormView phase={phase} />
          </div>

          {/* Results view */}
          <div style={{
            position: 'absolute', inset: 0, padding: '14px 20px',
            opacity: showResults ? 1 : 0,
            transform: showResults ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
            pointerEvents: 'none',
          }}>
            <ResultsView animate={showResults} />
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          background: 'var(--surface)', borderTop: '1px solid var(--border-light)',
          padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            {showResults ? '✨ Analysis complete' : '● Recording demo...'}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {done && (
              <button onClick={replay} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                background: 'var(--bg-warm)', border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
                <RotateCcw size={10} /> Replay
              </button>
            )}
            <button onClick={onCloseAction} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
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
