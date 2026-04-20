'use client';

import { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Check,
  Droplets,
  FileText,
  Flame,
  HeartPulse,
  Sparkles,
  Zap,
} from 'lucide-react';
import { easeOut } from './constants';
import { InsightCard, mockInsights } from './tutorialInsights';
import { TUTORIAL_RESULTS_PHASE } from './tutorialPhases';
import { TutorialPhaseBar } from './TutorialPhaseBar';
import { useTutorialPhase } from './useTutorialPhase';

const AGE = '34';
const WEIGHT = '72 kg';
const ACTIVITY = 'Moderate';

function useProfileStrings(phase: number) {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [activity, setActivity] = useState('');

  useEffect(() => {
    let alive = true;
    const handles: Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>> = [];

    const cancelAll = () => {
      alive = false;
      handles.forEach((h) => {
        window.clearTimeout(h);
        window.clearInterval(h);
      });
    };

    const defer = (fn: () => void) => {
      handles.push(
        window.setTimeout(() => {
          if (alive) fn();
        }, 0),
      );
    };

    if (phase === 0) {
      defer(() => {
        setAge('');
        setWeight('');
        setActivity('');
      });
      return cancelAll;
    }

    if (phase === 1) {
      defer(() => {
        setAge('');
        let i = 0;
        const id = window.setInterval(() => {
          if (!alive) return;
          i += 1;
          setAge(AGE.slice(0, i));
          if (i >= AGE.length) window.clearInterval(id);
        }, 200);
        handles.push(id);
      });
      return cancelAll;
    }

    if (phase === 2) {
      defer(() => setAge(AGE));
      return cancelAll;
    }

    if (phase === 3) {
      defer(() => {
        setWeight('');
        let i = 0;
        const id = window.setInterval(() => {
          if (!alive) return;
          i += 1;
          setWeight(WEIGHT.slice(0, i));
          if (i >= WEIGHT.length) window.clearInterval(id);
        }, 110);
        handles.push(id);
      });
      return cancelAll;
    }

    if (phase === 4) {
      defer(() => setWeight(WEIGHT));
      return cancelAll;
    }

    if (phase === 5) {
      defer(() => {
        setActivity('');
        let i = 0;
        const id = window.setInterval(() => {
          if (!alive) return;
          i += 1;
          setActivity(ACTIVITY.slice(0, i));
          if (i >= ACTIVITY.length) window.clearInterval(id);
        }, 95);
        handles.push(id);
      });
      return cancelAll;
    }

    if (phase >= 6) {
      defer(() => {
        setAge(AGE);
        setWeight(WEIGHT);
        setActivity(ACTIVITY);
      });
      return cancelAll;
    }

    return cancelAll;
  }, [phase]);

  const activeField =
    phase === 1 ? 'age' : phase === 3 ? 'weight' : phase === 5 ? 'activity' : null;

  return { age, weight, activity, activeField };
}

function DemoField({
  label,
  value,
  unit,
  active,
}: {
  label: string;
  value: string;
  unit?: string;
  active: boolean;
}) {
  const filled = value.length > 0;
  return (
    <div
      className="flex items-center justify-between rounded-lg px-2.5 py-2 min-h-[36px] transition-all duration-200"
      style={{
        border: `1.5px solid ${
          active ? 'rgba(125, 200, 138, 0.65)' : filled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'
        }`,
        background: active ? 'rgba(125, 200, 138, 0.12)' : 'rgba(0,0,0,0.28)',
        boxShadow: active ? '0 0 0 2px rgba(125, 200, 138, 0.15)' : 'none',
      }}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide w-16 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.95)' }}>
        {label}
      </span>
      <span
        className="text-[11px] font-semibold tabular-nums text-right min-w-0 flex-1"
        style={{ color: filled ? 'rgba(241, 245, 249, 0.98)' : 'rgba(100,116,139,0.5)' }}
      >
        {filled ? (
          <>
            {value}
            {unit ? <span className="font-normal opacity-70 ml-1">{unit}</span> : null}
          </>
        ) : (
          '—'
        )}
      </span>
    </div>
  );
}

const MARKERS = [
  { name: 'Total Cholesterol', val: '195', unit: 'mg/dL', tone: 'normal' as const, icon: Droplets },
  { name: 'HbA1c', val: '5.4', unit: '%', tone: 'normal' as const, icon: Activity },
  { name: 'LDL', val: '138', unit: 'mg/dL', tone: 'warn' as const, icon: HeartPulse },
  { name: 'TDEE', val: '2,340', unit: 'kcal', tone: 'info' as const, icon: Zap },
];

function MarkerRow({
  m,
  show,
  delay,
  compact,
}: {
  m: (typeof MARKERS)[number];
  show: boolean;
  delay: number;
  compact?: boolean;
}) {
  const Icon = m.icon;
  const colors = {
    normal: { fg: '#86efac', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
    warn: { fg: '#fcd34d', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)' },
    info: { fg: '#7dd3fc', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)' },
  };
  const c = colors[m.tone];
  const pad = compact ? 'px-2 py-1.5' : 'px-2.5 py-2';
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg ${pad}`}
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: `1px solid ${show ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delay}s`,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="flex items-center justify-center rounded-md flex-shrink-0"
          style={{
            width: compact ? 22 : 26,
            height: compact ? 22 : 26,
            background: c.bg,
            border: `1px solid ${c.border}`,
          }}
        >
          <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} style={{ color: c.fg }} aria-hidden />
        </div>
        <span className={`font-medium truncate ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'rgba(226,232,240,0.95)' }}>
          {m.name}
        </span>
      </div>
      <div className="flex items-baseline gap-1 flex-shrink-0">
        <span className={`font-bold tabular-nums ${compact ? 'text-[11px]' : 'text-sm'}`} style={{ color: c.fg }}>
          {m.val}
        </span>
        <span className="text-[9px]" style={{ color: 'rgba(148,163,184,0.9)' }}>
          {m.unit}
        </span>
      </div>
    </div>
  );
}

function ResultsScoreRing({ animate, size = 88 }: { animate: boolean; size?: number }) {
  const gid = useId().replace(/:/g, '');
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = animate ? (82 / 100) * circ : 0;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - progress}
          style={{ transition: animate ? 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}
        />
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5a8f65" />
            <stop offset="100%" stopColor="#a8e6b8" />
          </linearGradient>
        </defs>
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          opacity: animate ? 1 : 0,
          transform: animate ? 'scale(1)' : 'scale(0.85)',
          transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.35s',
        }}
      >
        <span className="text-2xl font-bold tabular-nums" style={{ color: '#ecfdf5' }}>
          82
        </span>
        <span className="text-[9px] font-medium uppercase tracking-wide" style={{ color: 'rgba(148,163,184,0.95)' }}>
          Health score
        </span>
      </div>
    </div>
  );
}

function PulsingMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <motion.div
      className="rounded-xl p-3 flex-1 min-w-0"
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(125,200,138,0)',
          '0 0 22px 0 rgba(125,200,138,0.2)',
          '0 0 0 0 rgba(125,200,138,0)',
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'rgba(148,163,184,0.95)' }}>
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums" style={{ color: '#e8fdf0' }}>
        {value}
      </p>
      <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'rgba(148,163,184,0.88)' }}>
        {sub}
      </p>
    </motion.div>
  );
}

export function TutorialDemoScene({ layout }: { layout: 'phone' | 'web' }) {
  const { phase } = useTutorialPhase();
  const { age, weight, activity, activeField } = useProfileStrings(phase);
  const showResults = phase >= TUTORIAL_RESULTS_PHASE;

  const uploadPulse = phase === 6;
  const fileVisible = phase >= 7;
  const scanComplete = phase >= 8;
  const scanIntense = phase === 7;
  const analyzeActive = phase === 9 || phase === 10;
  const analyzing = phase === 11;

  const isWeb = layout === 'web';

  return (
    <div className="relative w-full select-none">
      <style>{`
        @keyframes tutorialDemoSpin { to { transform: rotate(360deg); } }
        @keyframes tutorialScanPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.95; }
        }
      `}</style>

      <div className={`relative overflow-hidden rounded-xl ${isWeb ? 'min-h-[340px] sm:min-h-[380px]' : 'min-h-[420px]'}`}>
        {/* Form + flow */}
        <div
          className="absolute inset-0 overflow-y-auto pointer-events-none"
          style={{
            opacity: showResults ? 0 : 1,
            transform: showResults ? 'translateY(-12px)' : 'translateY(0)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: isWeb ? '14px 18px' : '10px 12px',
          }}
        >
          <div className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'rgba(248,250,252,0.95)' }}>
            <span aria-hidden>📝</span> Your profile
          </div>
          <div className={`grid gap-1.5 mb-4 ${isWeb ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
            <DemoField label="Age" value={age} unit="yrs" active={activeField === 'age'} />
            {isWeb ? (
              <>
                <DemoField label="Activity" value={activity} active={activeField === 'activity'} />
                <DemoField label="Weight" value={weight} active={activeField === 'weight'} />
                <DemoField label="Goal" value="Maintain" active={false} />
              </>
            ) : (
              <>
                <DemoField label="Weight" value={weight} active={activeField === 'weight'} />
                <DemoField label="Activity" value={activity} active={activeField === 'activity'} />
                <DemoField label="Goal" value="Maintain" active={false} />
              </>
            )}
          </div>

          <div className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'rgba(248,250,252,0.95)' }}>
            <span aria-hidden>📄</span> Lab results
          </div>
          <motion.div
            className="relative rounded-xl overflow-hidden mb-4"
            style={{
              border: `1.5px dashed ${
                uploadPulse || scanIntense ? 'rgba(125,200,138,0.55)' : 'rgba(255,255,255,0.12)'
              }`,
              background: uploadPulse || scanIntense ? 'rgba(125,200,138,0.08)' : 'rgba(0,0,0,0.2)',
              minHeight: isWeb ? 100 : 88,
              padding: fileVisible ? '10px 12px' : '14px 12px',
            }}
            animate={
              uploadPulse || scanIntense
                ? { boxShadow: ['0 0 0 0 rgba(125,200,138,0)', '0 0 28px 0 rgba(125,200,138,0.22)', '0 0 0 0 rgba(125,200,138,0)'] }
                : {}
            }
            transition={{ duration: 1.8, repeat: uploadPulse || scanIntense ? Infinity : 0, ease: 'easeInOut' }}
          >
            {!fileVisible ? (
              <div className="flex flex-col items-center justify-center gap-2 py-2">
                <motion.div
                  animate={uploadPulse ? { y: [0, -3, 0] } : {}}
                  transition={{ duration: 2, repeat: uploadPulse ? Infinity : 0, ease: 'easeInOut' }}
                >
                  <FileText className="w-8 h-8" style={{ color: 'rgba(125,200,138,0.85)' }} aria-hidden />
                </motion.div>
                <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.95)' }}>
                  Drop PDF or tap to upload
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#9fd9ae' }} aria-hidden />
                  <span className="text-[10px] font-medium truncate" style={{ color: 'rgba(241,245,249,0.95)' }}>
                    blood_panel_2026.pdf
                  </span>
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#86efac' }} aria-hidden />
                </div>
                <div className="relative h-24 rounded-lg overflow-hidden mx-auto w-full max-w-[200px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background:
                        'repeating-linear-gradient(12deg, transparent, transparent 8px, rgba(255,255,255,0.04) 8px, rgba(255,255,255,0.04) 9px)',
                    }}
                  />
                  {fileVisible ? (
                    <>
                      <motion.div
                        className="absolute left-0 right-0 h-[2px] z-[1]"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(125,200,138,0.95), transparent)',
                          boxShadow: '0 0 20px rgba(125,200,138,0.7)',
                        }}
                        initial={{ top: '8%' }}
                        animate={{ top: ['8%', '92%', '8%'] }}
                        transition={{
                          duration: scanComplete ? 1.1 : 2.2,
                          repeat: scanComplete ? 0 : Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 z-[2] pointer-events-none"
                        style={{
                          background: 'linear-gradient(105deg, transparent 40%, rgba(125,200,138,0.14) 50%, transparent 60%)',
                        }}
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.6, repeat: scanComplete ? 0 : Infinity, ease: 'linear' }}
                      />
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute left-0 right-0 h-px bg-emerald-400/40"
                          style={{ top: `${28 + i * 22}%`, transform: `rotate(${-6 + i * 6}deg)` }}
                          animate={{ opacity: [0.2, 0.9, 0.2] }}
                          transition={{ duration: 1.1, repeat: scanComplete ? 0 : Infinity, delay: i * 0.22 }}
                        />
                      ))}
                    </>
                  ) : null}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mx-auto w-[70%]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #5a8f65, #7dc88a)',
                      boxShadow: '0 0 12px rgba(125,200,138,0.45)',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: scanComplete ? '100%' : fileVisible ? '35%' : '0%' }}
                    transition={{ duration: scanComplete ? 0.85 : 0.6, ease: easeOut }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          <div className="flex justify-center pt-1">
            <div
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-semibold"
              style={{
                color: '#0b120e',
                background: 'linear-gradient(135deg, #5a8f65 0%, #7dc88a 100%)',
                boxShadow: analyzeActive ? '0 6px 24px rgba(90, 143, 101, 0.45)' : '0 2px 12px rgba(90, 143, 101, 0.25)',
                transform: phase === 10 ? 'scale(0.94)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
            >
              {analyzing ? (
                <>
                  <span
                    className="inline-block rounded-full border-2 border-white/30 border-t-white"
                    style={{ width: 13, height: 13, animation: 'tutorialDemoSpin 0.65s linear infinite' }}
                  />
                  Analyzing…
                </>
              ) : (
                <>
                  Analyze my health
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div
          className="absolute inset-0 overflow-y-auto pointer-events-none"
          style={{
            opacity: showResults ? 1 : 0,
            transform: showResults ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.12s',
            padding: isWeb ? '14px 18px' : '10px 12px',
          }}
        >
          <div className="text-[11px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'rgba(248,250,252,0.95)' }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#c4f0cd' }} aria-hidden />
            Your results
          </div>

          {isWeb ? (
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start gap-3">
                <ResultsScoreRing animate={showResults} size={100} />
                <p className="text-[10px] text-center lg:text-left max-w-[200px]" style={{ color: 'rgba(148,163,184,0.95)' }}>
                  Lipids, metabolic markers, and calories — distilled into one view.
                </p>
                <div className="w-full grid grid-cols-2 gap-2">
                  <PulsingMetric label="TDEE" value="2,340" sub="maintenance" />
                  <PulsingMetric label="Target" value="1,890" sub="deficit tier" />
                </div>
              </div>
              <div className="lg:col-span-7 min-w-0 space-y-2">
                {MARKERS.map((m, i) => (
                  <MarkerRow key={m.name} m={m} show={showResults} delay={0.35 + i * 0.1} />
                ))}
                <motion.div
                  className="rounded-xl p-3 mt-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(125,200,138,0.1) 0%, rgba(96,165,250,0.06) 100%)',
                    border: '1px solid rgba(125,200,138,0.22)',
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={showResults ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.85, duration: 0.45, ease: easeOut }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-3.5 h-3.5" style={{ color: '#fbbf77' }} aria-hidden />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#d1fae5' }}>
                      Insights unlocked
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed mb-2" style={{ color: 'rgba(203,213,225,0.92)' }}>
                    Next: personalize macros and track how your score moves with each lab.
                  </p>
                </motion.div>
                <motion.ul
                  className="grid sm:grid-cols-2 gap-2 pt-1"
                  initial="hidden"
                  animate={showResults ? 'show' : 'hidden'}
                  variants={{
                    show: { transition: { staggerChildren: 0.06, delayChildren: 1 } },
                    hidden: {},
                  }}
                >
                  {mockInsights.map((item) => (
                    <InsightCard key={item.headline} item={item} compact />
                  ))}
                </motion.ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col items-center gap-2">
                <ResultsScoreRing animate={showResults} size={76} />
              </div>
              <div className="space-y-1.5">
                {MARKERS.map((m, i) => (
                  <MarkerRow key={m.name} m={m} show={showResults} delay={0.35 + i * 0.1} compact />
                ))}
              </div>
              <motion.div
                className="rounded-lg px-2.5 py-2 mt-1"
                style={{
                  background: 'rgba(125,200,138,0.1)',
                  border: '1px solid rgba(125,200,138,0.2)',
                }}
                initial={{ opacity: 0 }}
                animate={showResults ? { opacity: 1 } : {}}
                transition={{ delay: 0.9, duration: 0.4 }}
              >
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#c8f5d2' }}>
                  Insights
                </p>
                <motion.ul
                  className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5"
                  initial="hidden"
                  animate={showResults ? 'show' : 'hidden'}
                  variants={{
                    show: { transition: { staggerChildren: 0.07, delayChildren: 1.05 } },
                    hidden: {},
                  }}
                >
                  {mockInsights.map((item) => (
                    <InsightCard key={item.headline} item={item} compact />
                  ))}
                </motion.ul>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <TutorialPhaseBar phase={phase} />
    </div>
  );
}
