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
      className="flex items-center justify-between rounded-lg px-2 py-1.5 min-h-[30px] transition-all duration-200"
      style={{
        border: `1.5px solid ${
          active ? 'rgba(125, 200, 138, 0.65)' : filled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'
        }`,
        background: active ? 'rgba(125, 200, 138, 0.12)' : 'rgba(0,0,0,0.28)',
        boxShadow: active ? '0 0 0 2px rgba(125, 200, 138, 0.15)' : 'none',
      }}
    >
      <span className="text-[9px] font-medium uppercase tracking-wide w-14 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.95)' }}>
        {label}
      </span>
      <span
        className="text-[10px] font-semibold tabular-nums text-right min-w-0 flex-1"
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
  const pad = compact ? 'px-2 py-1' : 'px-2 py-1.5';
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg ${pad}`}
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: `1px solid ${show ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delay}s`,
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <div
          className="flex items-center justify-center rounded-md flex-shrink-0"
          style={{
            width: compact ? 20 : 22,
            height: compact ? 20 : 22,
            background: c.bg,
            border: `1px solid ${c.border}`,
          }}
        >
          <Icon className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} style={{ color: c.fg }} aria-hidden />
        </div>
        <span className={`font-medium truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`} style={{ color: 'rgba(226,232,240,0.95)' }}>
          {m.name}
        </span>
      </div>
      <div className="flex items-baseline gap-0.5 flex-shrink-0">
        <span className={`font-bold tabular-nums ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: c.fg }}>
          {m.val}
        </span>
        <span className="text-[8px]" style={{ color: 'rgba(148,163,184,0.9)' }}>
          {m.unit}
        </span>
      </div>
    </div>
  );
}

function ResultsScoreRing({
  animate,
  size = 72,
  variant = 'default',
}: {
  animate: boolean;
  size?: number;
  variant?: 'default' | 'phone';
}) {
  const gid = useId().replace(/:/g, '');
  const isPhone = variant === 'phone';
  const stroke = isPhone ? Math.min(8, Math.max(6, Math.round(size / 12))) : Math.max(5, Math.round(size / 15));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = animate ? (82 / 100) * circ : 0;
  const trackStroke = isPhone ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)';
  const scoreSize = isPhone ? 'text-[1.65rem] leading-none sm:text-3xl' : 'text-xl';

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        filter: isPhone ? 'drop-shadow(0 0 14px rgba(125, 200, 138, 0.32)) drop-shadow(0 0 28px rgba(90, 143, 101, 0.15))' : undefined,
      }}
    >
      {isPhone ? (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: -6,
            background: 'radial-gradient(ellipse at 50% 40%, rgba(125,200,138,0.22) 0%, rgba(15,25,20,0.4) 45%, transparent 70%)',
          }}
        />
      ) : null}
      <svg width={size} height={size} className="-rotate-90 relative z-[1]" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackStroke} strokeWidth={stroke} />
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
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="55%" stopColor="#7dc88a" />
            <stop offset="100%" stopColor="#d1fae5" />
          </linearGradient>
        </defs>
      </svg>
      <div
        className="absolute inset-0 z-[2] flex flex-col items-center justify-center"
        role="img"
        aria-label="Score 82 out of 100"
        style={{
          opacity: animate ? 1 : 0,
          transform: animate ? 'scale(1)' : 'scale(0.85)',
          transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.35s',
        }}
      >
        <span className={`font-bold tabular-nums font-display ${scoreSize}`} style={{ color: '#f0fdf4', textShadow: isPhone ? '0 1px 18px rgba(0,0,0,0.45)' : undefined }}>
          82
        </span>
      </div>
    </div>
  );
}

function PulsingMetric({ label, value, sub, compact }: { label: string; value: string; sub: string; compact?: boolean }) {
  return (
    <motion.div
      className={`rounded-lg flex-1 min-w-0 ${compact ? 'p-1.5' : 'p-2'}`}
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      animate={{
        boxShadow: [
          '0 0 0 0 rgba(125,200,138,0)',
          '0 0 18px 0 rgba(125,200,138,0.2)',
          '0 0 0 0 rgba(125,200,138,0)',
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <p className={`uppercase tracking-wide mb-0.5 ${compact ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: 'rgba(148,163,184,0.95)' }}>
        {label}
      </p>
      <p className={`font-bold tabular-nums ${compact ? 'text-sm' : 'text-base'}`} style={{ color: '#e8fdf0' }}>
        {value}
      </p>
      <p className={`leading-tight ${compact ? 'text-[8px]' : 'text-[9px]'}`} style={{ color: 'rgba(148,163,184,0.88)' }}>
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
    <div className="relative w-full h-full select-none flex flex-col">
      <style>{`
        @keyframes tutorialDemoSpin { to { transform: rotate(360deg); } }
        @keyframes tutorialScanPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.95; }
        }
      `}</style>

      <div className="relative flex-1 overflow-hidden rounded-lg min-h-0">
        {/* Form + flow */}
        <div
          className="absolute inset-0 overflow-y-auto pointer-events-none"
          style={{
            opacity: showResults ? 0 : 1,
            transform: showResults ? 'translateY(-10px)' : 'translateY(0)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: isWeb ? '10px 14px' : '8px 8px',
          }}
        >
          <div className="text-[10px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'rgba(248,250,252,0.95)' }}>
            <span aria-hidden>📝</span> Your profile
          </div>
          <div className={`grid gap-1 mb-3 ${isWeb ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
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

          <div className="text-[10px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'rgba(248,250,252,0.95)' }}>
            <span aria-hidden>📄</span> Lab results
          </div>
          <motion.div
            className="relative rounded-xl overflow-hidden mb-3"
            style={{
              border: `1.5px dashed ${
                uploadPulse || scanIntense ? 'rgba(125,200,138,0.55)' : 'rgba(255,255,255,0.12)'
              }`,
              background: uploadPulse || scanIntense ? 'rgba(125,200,138,0.08)' : 'rgba(0,0,0,0.2)',
              minHeight: isWeb ? 80 : 70,
              padding: fileVisible ? '8px 10px' : '10px 10px',
            }}
            animate={
              uploadPulse || scanIntense
                ? { boxShadow: ['0 0 0 0 rgba(125,200,138,0)', '0 0 24px 0 rgba(125,200,138,0.22)', '0 0 0 0 rgba(125,200,138,0)'] }
                : {}
            }
            transition={{ duration: 1.8, repeat: uploadPulse || scanIntense ? Infinity : 0, ease: 'easeInOut' }}
          >
            {!fileVisible ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                <motion.div
                  animate={uploadPulse ? { y: [0, -3, 0] } : {}}
                  transition={{ duration: 2, repeat: uploadPulse ? Infinity : 0, ease: 'easeInOut' }}
                >
                  <FileText className="w-6 h-6" style={{ color: 'rgba(125,200,138,0.85)' }} aria-hidden />
                </motion.div>
                <span className="text-[9px]" style={{ color: 'rgba(148,163,184,0.95)' }}>
                  Drop PDF or tap to upload
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9fd9ae' }} aria-hidden />
                  <span className="text-[9px] font-medium truncate" style={{ color: 'rgba(241,245,249,0.95)' }}>
                    blood_panel_2026.pdf
                  </span>
                  <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#86efac' }} aria-hidden />
                </div>
                <div className="relative h-16 rounded-lg overflow-hidden mx-auto w-full max-w-[160px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
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
                          boxShadow: '0 0 16px rgba(125,200,138,0.7)',
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
                <div className="h-1 rounded-full overflow-hidden mx-auto w-[65%]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #5a8f65, #7dc88a)',
                      boxShadow: '0 0 10px rgba(125,200,138,0.45)',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: scanComplete ? '100%' : fileVisible ? '35%' : '0%' }}
                    transition={{ duration: scanComplete ? 0.85 : 0.6, ease: easeOut }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          <div className="flex justify-center pt-0.5">
            <div
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-semibold"
              style={{
                color: '#0b120e',
                background: 'linear-gradient(135deg, #5a8f65 0%, #7dc88a 100%)',
                boxShadow: analyzeActive ? '0 4px 20px rgba(90, 143, 101, 0.45)' : '0 2px 10px rgba(90, 143, 101, 0.25)',
                transform: phase === 10 ? 'scale(0.94)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
            >
              {analyzing ? (
                <>
                  <span
                    className="inline-block rounded-full border-2 border-white/30 border-t-white"
                    style={{ width: 11, height: 11, animation: 'tutorialDemoSpin 0.65s linear infinite' }}
                  />
                  Analyzing…
                </>
              ) : (
                <>
                  Analyze my health
                  <ArrowRight className="w-3 h-3" aria-hidden />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div
          className="absolute inset-0 flex min-h-0 flex-col overflow-y-auto pointer-events-none"
          style={{
            opacity: showResults ? 1 : 0,
            transform: showResults ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.12s',
            padding: isWeb ? '10px 14px' : '8px 8px',
          }}
        >
          <div className="mb-2 flex shrink-0 items-center gap-1.5 text-[10px] font-semibold" style={{ color: 'rgba(248,250,252,0.95)' }}>
            <Sparkles className="w-3 h-3" style={{ color: '#c4f0cd' }} aria-hidden />
            Your results
          </div>

          {isWeb ? (
            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start gap-2">
                <ResultsScoreRing animate={showResults} size={80} />
                <p className="text-[9px] text-center lg:text-left max-w-[180px]" style={{ color: 'rgba(148,163,184,0.95)' }}>
                  Lipids, metabolic markers, and calories — distilled into one view.
                </p>
                <div className="w-full grid grid-cols-2 gap-1.5">
                  <PulsingMetric label="TDEE" value="2,340" sub="maintenance" />
                  <PulsingMetric label="Target" value="1,890" sub="deficit tier" />
                </div>
              </div>
              <div className="lg:col-span-7 min-w-0 space-y-1.5">
                {MARKERS.map((m, i) => (
                  <MarkerRow key={m.name} m={m} show={showResults} delay={0.3 + i * 0.08} />
                ))}
                <motion.div
                  className="rounded-lg p-2.5 mt-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(125,200,138,0.1) 0%, rgba(96,165,250,0.06) 100%)',
                    border: '1px solid rgba(125,200,138,0.22)',
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={showResults ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.7, duration: 0.4, ease: easeOut }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame className="w-3 h-3" style={{ color: '#fbbf77' }} aria-hidden />
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#d1fae5' }}>
                      Insights unlocked
                    </span>
                  </div>
                  <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(203,213,225,0.92)' }}>
                    Next: personalize macros and track how your score moves with each lab.
                  </p>
                </motion.div>
                <motion.ul
                  className="grid sm:grid-cols-2 gap-1.5 pt-0.5"
                  initial="hidden"
                  animate={showResults ? 'show' : 'hidden'}
                  variants={{
                    show: { transition: { staggerChildren: 0.05, delayChildren: 0.85 } },
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
            <div className="flex min-h-0 flex-1 flex-col gap-2 pb-1">
              <div className="flex w-full shrink-0 justify-center pt-0.5">
                <ResultsScoreRing animate={showResults} size={96} variant="phone" />
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-1.5">
                <PulsingMetric label="TDEE" value="2,340" sub="maintenance kcal" compact />
                <PulsingMetric label="Target" value="1,890" sub="deficit tier" compact />
              </div>
              <div className="shrink-0 space-y-1">
                {MARKERS.map((m, i) => (
                  <MarkerRow key={m.name} m={m} show={showResults} delay={0.28 + i * 0.07} compact />
                ))}
              </div>
              <div
                className="flex min-h-0 flex-1 flex-col rounded-lg px-1.5 pb-1 pt-1.5"
                style={{
                  background: 'linear-gradient(180deg, rgba(125,200,138,0.1) 0%, rgba(0,0,0,0.2) 100%)',
                  border: '1px solid rgba(125,200,138,0.2)',
                }}
              >
                <div className="mb-1.5 flex shrink-0 items-center gap-1 px-1">
                  <Flame className="h-3 w-3" style={{ color: '#fbbf77' }} aria-hidden />
                  <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: '#d1fae5' }}>
                    Insights unlocked
                  </span>
                </div>
                <motion.ul
                  className="flex min-h-0 flex-1 list-none flex-col gap-1.5 overflow-y-auto overscroll-contain pr-0.5"
                  initial="hidden"
                  animate={showResults ? 'show' : 'hidden'}
                  variants={{
                    show: { transition: { staggerChildren: 0.06, delayChildren: 0.72 } },
                    hidden: {},
                  }}
                >
                  {mockInsights.map((item) => (
                    <InsightCard key={item.headline} item={item} compact />
                  ))}
                </motion.ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <TutorialPhaseBar phase={phase} />
    </div>
  );
}
