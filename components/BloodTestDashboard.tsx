'use client';

import dynamic from 'next/dynamic';
import { AnalysisResult, BloodMarkers, Insight, UserProfile } from '@/types';
import { REFERENCE_RANGES, getMarkerStatus } from '@/lib/bloodParser';
import BetterCalsMark from '@/components/BetterCalsMark';
import {
  Heart,
  Flame,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  ArrowLeft,
  Droplets,
  Zap,
  Pill,
  Shield,
} from 'lucide-react';
import CalorieTiersCard from '@/components/dashboard/CalorieTiersCard';
import RecommendationsPanel from '@/components/dashboard/RecommendationsPanel';

const MacroDonutChart = dynamic(() => import('@/components/dashboard/MacroDonutChart'), { ssr: false });
const HealthRadarChart = dynamic(() => import('@/components/dashboard/HealthRadarChart'), { ssr: false });
const MarkerComparisonChart = dynamic(() => import('@/components/dashboard/MarkerComparisonChart'), { ssr: false });

interface BloodTestDashboardProps {
  result: AnalysisResult;
  markers: BloodMarkers;
  profile: UserProfile;
  onReset: () => void;
}

const MARKER_NAMES: Record<keyof BloodMarkers, string> = {
  glucose: 'Glucose',
  hba1c: 'HbA1c',
  totalCholesterol: 'Total Cholesterol',
  ldl: 'LDL Cholesterol',
  hdl: 'HDL Cholesterol',
  triglycerides: 'Triglycerides',
  tsh: 'TSH',
  vitaminD: 'Vitamin D',
  vitaminB12: 'Vitamin B12',
  ferritin: 'Ferritin',
  iron: 'Serum Iron',
};

const CATEGORIES: {
  key: string;
  label: string;
  icon: React.ElementType;
  scoreKey: 'metabolic' | 'cardiovascular' | 'hormonal' | 'nutritional';
  markers: (keyof BloodMarkers)[];
  accent: string;
  accentBg: string;
}[] = [
  {
    key: 'metabolic',
    label: 'Metabolic',
    icon: Flame,
    scoreKey: 'metabolic',
    markers: ['glucose', 'hba1c'],
    accent: 'var(--accent-warm)',
    accentBg: '#f9f5ec',
  },
  {
    key: 'cardiovascular',
    label: 'Cardiovascular',
    icon: Heart,
    scoreKey: 'cardiovascular',
    markers: ['totalCholesterol', 'ldl', 'hdl', 'triglycerides'],
    accent: 'var(--accent-rose)',
    accentBg: '#f9ecec',
  },
  {
    key: 'hormonal',
    label: 'Hormonal',
    icon: Zap,
    scoreKey: 'hormonal',
    markers: ['tsh'],
    accent: 'var(--status-info)',
    accentBg: '#ecf0f6',
  },
  {
    key: 'nutritional',
    label: 'Nutritional',
    icon: Pill,
    scoreKey: 'nutritional',
    markers: ['vitaminD', 'vitaminB12', 'ferritin', 'iron'],
    accent: 'var(--accent)',
    accentBg: '#ecf3ee',
  },
];

function getScoreGrade(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: 'var(--status-normal)' };
  if (score >= 70) return { label: 'Good', color: 'var(--accent-warm)' };
  if (score >= 50) return { label: 'Fair', color: 'var(--status-warning)' };
  return { label: 'Needs Attention', color: 'var(--status-danger)' };
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'normal':
      return { color: 'var(--status-normal)', bg: 'var(--status-normal-bg)', label: 'Normal' };
    case 'low':
      return { color: 'var(--status-info)', bg: 'var(--status-info-bg)', label: 'Low' };
    case 'high':
      return { color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', label: 'High' };
    case 'critical':
      return { color: 'var(--status-danger)', bg: 'var(--status-danger-bg)', label: 'Critical' };
    default:
      return { color: 'var(--text-secondary)', bg: 'var(--border-light)', label: status };
  }
}

function getRangePercent(key: keyof BloodMarkers, value: number): number {
  const range = REFERENCE_RANGES[key];
  if (!range) return 50;
  const visualMin = range.min * 0.5;
  const visualMax = range.max * 1.5;
  const pct = ((value - visualMin) / (visualMax - visualMin)) * 100;
  return Math.max(2, Math.min(98, pct));
}

function getRangeNormalZone(key: keyof BloodMarkers): { left: number; width: number } {
  const range = REFERENCE_RANGES[key];
  if (!range) return { left: 20, width: 60 };
  const visualMin = range.min * 0.5;
  const visualMax = range.max * 1.5;
  const left = ((range.min - visualMin) / (visualMax - visualMin)) * 100;
  const right = ((range.max - visualMin) / (visualMax - visualMin)) * 100;
  return { left, width: right - left };
}

// ── Sub-components ──

function ScoreRing({ score, size = 150 }: { score: number; size?: number }) {
  const grade = getScoreGrade(score);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative score-enter" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border-light)" strokeWidth="8"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={grade.color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="score-ring-anim"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl leading-none" style={{ color: grade.color }}>
          {score}
        </span>
        <span
          className="text-[10px] font-semibold mt-1 uppercase tracking-[0.15em]"
          style={{ color: grade.color }}
        >
          {grade.label}
        </span>
      </div>
    </div>
  );
}

function RangeBar({ markerKey, value, delay }: { markerKey: keyof BloodMarkers; value: number; delay: number }) {
  const status = getMarkerStatus(markerKey, value);
  const style = getStatusStyle(status);
  const needlePos = getRangePercent(markerKey, value);
  const normalZone = getRangeNormalZone(markerKey);
  const range = REFERENCE_RANGES[markerKey];

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {MARKER_NAMES[markerKey]}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums" style={{ color: style.color }}>
            {value}
            <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {range?.unit}
            </span>
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: style.color, backgroundColor: style.bg }}
          >
            {style.label}
          </span>
        </div>
      </div>

      <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-light)' }}>
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${normalZone.left}%`,
            width: `${normalZone.width}%`,
            backgroundColor: 'var(--status-normal-bg)',
            border: '1px solid var(--status-normal-border)',
          }}
        />
        <div
          className="absolute top-1/2 needle-pop"
          style={{
            left: `${needlePos}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            animationDelay: `${delay}ms`,
          }}
        >
          <div
            className="w-3 h-3 rounded-full border-2"
            style={{
              backgroundColor: style.color,
              borderColor: 'var(--surface)',
              boxShadow: `0 0 0 1px ${style.color}33, 0 1px 3px ${style.color}22`,
            }}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{range?.min}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {markerKey === 'hdl' ? `60+ ${range?.unit}` : `${range?.max} ${range?.unit}`}
        </span>
      </div>
    </div>
  );
}

function CategoryCard({
  category, markers, score, delayBase,
}: {
  category: (typeof CATEGORIES)[number]; markers: BloodMarkers; score: number; delayBase: number;
}) {
  const Icon = category.icon;
  const grade = getScoreGrade(score);
  const present = category.markers.filter((k) => markers[k] !== undefined);
  if (present.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl card-hover noise"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: category.accentBg }}>
            <Icon className="w-4 h-4" style={{ color: category.accent }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{category.label}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-display" style={{ color: grade.color }}>{score}</span>
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>/100</span>
        </div>
      </div>
      <div className="px-5 py-4 space-y-5">
        {present.map((key, i) => (
          <RangeBar key={key} markerKey={key} value={markers[key]!} delay={delayBase + i * 100} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight, delay }: { insight: Insight; delay: number }) {
  const cfg = {
    success: { icon: CheckCircle, color: 'var(--status-normal)', bg: 'var(--status-normal-bg)', border: 'var(--status-normal-border)' },
    warning: { icon: AlertTriangle, color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)' },
    danger:  { icon: XCircle, color: 'var(--status-danger)', bg: 'var(--status-danger-bg)', border: 'var(--status-danger-border)' },
    info:    { icon: Info, color: 'var(--status-info)', bg: 'var(--status-info-bg)', border: 'var(--status-info-border)' },
  }[insight.type];
  const Icon = cfg.icon;

  return (
    <div
      className="anim-fade-up rounded-xl p-4 card-hover"
      style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, animationDelay: `${delay}ms` }}
    >
      <div className="flex gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{insight.title}</h4>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{insight.description}</p>
          {insight.recommendation && (
            <p
              className="text-sm mt-2 leading-relaxed pl-3"
              style={{ color: 'var(--text-secondary)', borderLeft: `2px solid ${cfg.color}44` }}
            >
              {insight.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FlagSection({ title, items, variant }: { title: string; items: string[]; variant: 'warning' | 'danger' }) {
  if (items.length === 0) return null;
  const isWarning = variant === 'warning';
  const Icon = isWarning ? AlertTriangle : Shield;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: isWarning ? 'var(--status-warning-bg)' : 'var(--status-danger-bg)',
        border: `1px solid ${isWarning ? 'var(--status-warning-border)' : 'var(--status-danger-border)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: isWarning ? 'var(--status-warning)' : 'var(--status-danger)' }} />
        <h4
          className="text-[10px] font-bold uppercase tracking-[0.15em]"
          style={{ color: isWarning ? 'var(--status-warning)' : 'var(--status-danger)' }}
        >
          {title}
        </h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: isWarning ? 'var(--status-warning)' : 'var(--status-danger)' }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Dashboard ──

export default function BloodTestDashboard({ result, markers, profile, onReset }: BloodTestDashboardProps) {
  const { tdee, healthScore, insights, deficiencies, risks, calorieTiers, macros, recommendations } = result;
  const grade = getScoreGrade(healthScore.overall);
  const hasMarkers = Object.keys(markers).length > 0;
  const usedAverageMarkers = result.usedAverageMarkers === true;

  return (
    <div
      className="min-h-screen pb-16"
      style={{ background: 'linear-gradient(170deg, #f6f5f1 0%, #f0eeea 50%, #f5f3ef 100%)' }}
    >
      {/* Top bar */}
      <div
        className="anim-fade-up sticky top-0 z-30"
        style={{
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'rgba(246, 245, 241, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-sm font-medium group btn-press"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" style={{ color: 'var(--text-tertiary)' }} />
            New Analysis
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-[14px] flex items-center justify-center"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d2d2cc',
                boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
              }}
            >
              <BetterCalsMark className="w-6.5 h-6.5" />
            </div>
            <span className="text-sm font-bold font-display" style={{ color: 'var(--text-primary)' }}>BetterCals</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pt-8">
        {/* 1. Hero: Score + BMR/TDEE inline + BMI badge */}
        <div className="anim-fade-up delay-1">
          <div
            className="relative overflow-hidden rounded-2xl noise"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)',
            }}
          >
            <div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.07]"
              style={{ background: `radial-gradient(circle, ${grade.color} 0%, transparent 70%)` }}
            />

            <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 p-6 md:p-8">
              {hasMarkers && (
                <div className="flex flex-col items-center justify-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    Health Score
                  </p>
                  <ScoreRing score={healthScore.overall} />
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h1 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>
                    Your Results
                  </h1>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {usedAverageMarkers ? 'Based on your profile and estimated average markers' : 'Based on your profile and blood markers'}
                  </p>
                </div>

                {usedAverageMarkers && (
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: 'var(--status-info-bg)',
                      border: '1px solid var(--status-info-border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Using population averages (no report provided)
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Enter your real blood values for accurate risks, deficiencies, and personalized insights.
                    </p>
                  </div>
                )}

                {/* Inline BMR / TDEE / BMI */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}>
                    <Flame className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>BMR</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tdee.bmr.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}>
                    <Activity className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>TDEE</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tdee.tdee.toLocaleString()}</span>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: `${getScoreGrade(recommendations.bmi < 18.5 ? 50 : recommendations.bmi < 25 ? 90 : recommendations.bmi < 30 ? 60 : 30).color}12`,
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>BMI</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{recommendations.bmi}</span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {recommendations.bmiCategory}
                    </span>
                  </div>
                </div>

                {hasMarkers && (
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat, idx) => {
                      const s = healthScore[cat.scoreKey];
                      const g = getScoreGrade(s);
                      return (
                        <div key={cat.key} className="text-center">
                          <div className="h-1 rounded-full mb-2" style={{ backgroundColor: 'var(--border-light)' }}>
                            <div
                              className="h-full rounded-full track-grow"
                              style={{ width: `${s}%`, backgroundColor: g.color, animationDelay: `${0.5 + idx * 0.1}s` }}
                            />
                          </div>
                          <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            {cat.label}
                          </span>
                          <span className="block text-xs font-semibold mt-0.5" style={{ color: g.color }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Calorie Goal Tiers */}
        <div className="mt-8 anim-fade-up delay-2">
          <CalorieTiersCard
            tiers={calorieTiers}
            userGoal={profile.goal}
            targetCalories={tdee.targetCalories}
          />
        </div>

        {/* 3. Macro Breakdown */}
        <div className="mt-8 anim-fade-up delay-3">
          <MacroDonutChart macros={macros} />
        </div>

        {/* 4. Charts row — radar + marker comparison */}
        {hasMarkers && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 anim-fade-up delay-4">
            <HealthRadarChart healthScore={healthScore} />
            <MarkerComparisonChart markers={markers} />
          </div>
        )}

        {/* 5. Category cards with range bars */}
        {hasMarkers && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            {CATEGORIES.map((cat, i) => (
              <div key={cat.key} className={`anim-fade-up delay-${i + 5}`}>
                <CategoryCard category={cat} markers={markers} score={healthScore[cat.scoreKey]} delayBase={400 + i * 150} />
              </div>
            ))}
          </div>
        )}

        {/* 6. Recommendations panel */}
        <div className="mt-8 anim-fade-up delay-9">
          <RecommendationsPanel recs={recommendations} />
        </div>

        {/* 7. Flags */}
        {!usedAverageMarkers && (deficiencies.length > 0 || risks.length > 0) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 anim-fade-up delay-10">
            <FlagSection title="Potential Deficiencies" items={deficiencies} variant="warning" />
            <FlagSection title="Health Risks" items={risks} variant="danger" />
          </div>
        )}

        {/* 8. Insights */}
        {!usedAverageMarkers && insights.length > 0 && (
          <div className="mt-8 anim-fade-up">
            <h2 className="font-display text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
              Insights & Recommendations
            </h2>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} delay={600 + i * 80} />
              ))}
            </div>
          </div>
        )}

        {/* 9. Footer */}
        <div className="mt-12 pt-6 text-center anim-fade-up" style={{ borderTop: '1px solid var(--border-light)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            BetterCals provides estimates for informational purposes only.
            Always consult healthcare professionals for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
