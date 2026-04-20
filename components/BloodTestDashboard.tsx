'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnalysisResult, BloodMarkers, FoodSensitivityFlag, Insight, MarkerStatus, UserProfile } from '@/types';
import {
  getMarkerBarScale,
  getMarkerDisplayRange,
  getMarkerInterpretation,
  getMarkerTiers,
  getMarkerUnit,
  markerValueToBarPercent,
} from '@/lib/bloodParser';
import MarkerEducationDrawer from '@/components/dashboard/MarkerEducationDrawer';
import VitalsMark from '@/components/VitalsMark';
import {
  Heart,
  Flame,
  Activity,
  Download,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  ArrowLeft,
  Droplets,
  Zap,
  Pill,
  Shield,
  FlaskConical,
  Bean,
  Save,
  Check,
  History,
  Rows3,
  Brain,
  LineChart,
  FileSpreadsheet,
  FileJson,
  Share2,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import ProfileDropdown from '@/components/ProfileDropdown';
import CalorieTiersCard from '@/components/dashboard/CalorieTiersCard';
import RecommendationsPanel from '@/components/dashboard/RecommendationsPanel';
import ASCVDRiskCard from '@/components/dashboard/ASCVDRiskCard';
import RestingHeartRateCard from '@/components/dashboard/RestingHeartRateCard';
import FoodSensitivityCard from '@/components/dashboard/FoodSensitivityCard';
import ActionPlanCard from '@/components/dashboard/ActionPlanCard';
import PopulationBenchmarksCard from '@/components/dashboard/PopulationBenchmarksCard';
import { deriveActionPlan, derivePopulationBenchmarks } from '@/lib/derivedInsights';
import { debugLog } from '@/lib/debugLog';
import { MARKER_NAMES } from '@/lib/calculations';

import { SkeletonChart } from '@/components/dashboard/Skeleton';
import TechnicalMethodology from '@/components/TechnicalMethodology';
import MedicalDisclaimer from '@/components/MedicalDisclaimer';

const MacroDonutChart = dynamic(() => import('@/components/dashboard/MacroDonutChart'), { ssr: false, loading: () => <SkeletonChart /> });
const HealthRadarChart = dynamic(() => import('@/components/dashboard/HealthRadarChart'), { ssr: false, loading: () => <SkeletonChart /> });
const MarkerComparisonChart = dynamic(() => import('@/components/dashboard/MarkerComparisonChart'), { ssr: false, loading: () => <SkeletonChart /> });

interface BloodTestDashboardProps {
  result: AnalysisResult;
  markers: BloodMarkers;
  profile: UserProfile;
  onReset: () => void;
  onEditProfile?: () => void;
  resetLabel?: string;
  /** Show the full medical disclaimer on this Result view. Set false to omit (e.g. embedded previews). */
  showMedicalDisclaimer?: boolean;
}

const CATEGORIES: {
  key: string;
  label: string;
  icon: React.ElementType;
  scoreKey: 'metabolic' | 'cardiovascular' | 'hormonal' | 'nutritional' | 'hepatic' | 'renal';
  markers: (keyof BloodMarkers)[];
  accent: string;
  accentBg: string;
}[] = [
  {
    key: 'metabolic',
    label: 'Metabolic',
    icon: Flame,
    scoreKey: 'metabolic',
    markers: ['glucose', 'hba1c', 'fastingInsulin'],
    accent: 'var(--accent-warm)',
    accentBg: '#f9f5ec',
  },
  {
    key: 'cardiovascular',
    label: 'Cardiovascular',
    icon: Heart,
    scoreKey: 'cardiovascular',
    markers: ['totalCholesterol', 'ldl', 'hdl', 'triglycerides', 'nonHdl', 'apoB', 'hsCRP'],
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
  {
    key: 'hepatic',
    label: 'Hepatic',
    icon: FlaskConical,
    scoreKey: 'hepatic',
    markers: ['alt', 'ast', 'albumin'],
    accent: 'var(--accent-warm)',
    accentBg: '#f6f0ec',
  },
  {
    key: 'renal',
    label: 'Renal',
    icon: Bean,
    scoreKey: 'renal',
    markers: ['creatinine', 'uricAcid'],
    accent: 'var(--status-warning)',
    accentBg: '#f6f3ec',
  },
];

const BIOMARKER_COLUMNS: Array<Array<(typeof CATEGORIES)[number]['key']>> = [
  ['metabolic', 'nutritional'],
  ['cardiovascular'],
  ['hormonal', 'renal', 'hepatic'],
];

type ResultsTab = 'biomarkers' | 'recommendations' | 'insights' | 'trends';

const TAB_META: Record<ResultsTab, { label: string; icon: React.ElementType }> = {
  biomarkers: { label: 'Biomarkers', icon: Rows3 },
  recommendations: { label: 'Recommendations', icon: Brain },
  insights: { label: 'Insights', icon: Shield },
  trends: { label: 'Trends', icon: LineChart },
};

function getBmiScore(bmi: number): number {
  if (bmi < 18.5) return 50;
  if (bmi < 25) return 90;
  if (bmi < 30) return 60;
  return 30;
}

function getScoreGrade(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: 'var(--status-normal)' };
  if (score >= 70) return { label: 'Good', color: 'var(--accent-warm)' };
  if (score >= 50) return { label: 'Fair', color: 'var(--status-warning)' };
  return { label: 'Needs Attention', color: 'var(--status-danger)' };
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'optimal':
      return { color: 'var(--status-normal)', bg: 'var(--status-normal-bg)', label: 'Optimal' };
    case 'normal':
      return { color: 'var(--status-normal)', bg: 'var(--status-normal-bg)', label: 'Normal' };
    case 'borderline':
      return { color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', label: 'Borderline' };
    case 'low':
      return { color: 'var(--status-info)', bg: 'var(--status-info-bg)', label: 'Low' };
    case 'high':
      return { color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', label: 'High' };
    case 'critical':
      return { color: 'var(--status-danger)', bg: 'var(--status-danger-bg)', label: 'Critical' };
    case 'unknown':
      return { color: 'var(--text-tertiary)', bg: 'var(--border-light)', label: 'Unmapped' };
    default:
      return { color: 'var(--text-secondary)', bg: 'var(--border-light)', label: status };
  }
}

function getStatusTone(status: MarkerStatus) {
  const style = getStatusStyle(status);
  return {
    ...style,
    fill:
      status === 'optimal' || status === 'normal'
        ? 'var(--status-normal)'
        : status === 'low'
          ? 'var(--status-info)'
          : status === 'borderline'
            ? 'var(--accent-warm)'
            : status === 'high'
              ? 'var(--status-warning)'
              : status === 'critical'
                ? 'var(--status-danger)'
                : 'var(--text-tertiary)',
  };
}

function getRangeSegments(key: keyof BloodMarkers, gender?: UserProfile['gender']) {
  const tiers = getMarkerTiers(key, gender);
  const reference = getMarkerDisplayRange(key, gender);
  const scale = getMarkerBarScale(key, gender);
  if (!reference || !scale || tiers.length === 0) {
    return [
      {
        left: 0,
        width: 100,
        label: 'Reference',
        status: 'normal' as MarkerStatus,
      },
    ];
  }

  const { visualMin, visualMax } = scale;

  return tiers.map((tier, index) => {
    const tierMin = Math.max(visualMin, tier.min);
    const tierMaxRaw = Number.isFinite(tier.max) && tier.max < 9999 ? tier.max : visualMax;
    const tierMax = Math.max(tierMin, Math.min(visualMax, tierMaxRaw));
    const left = ((tierMin - visualMin) / Math.max(1, visualMax - visualMin)) * 100;
    const right = ((tierMax - visualMin) / Math.max(1, visualMax - visualMin)) * 100;
    return {
      left: Math.max(0, Math.min(100, left)),
      width: Math.max(index === tiers.length - 1 ? 100 - left : 4, right - left),
      label: getStatusStyle(tier.status).label,
      status: tier.status,
    };
  });
}

/** Decorative Gaussian on the bar axis — peak near optimal (or normal) tier center. */
function bellDistributionPath(
  visualMin: number,
  visualMax: number,
  tiers: ReturnType<typeof getMarkerTiers>,
): string {
  const span = visualMax - visualMin || 1;
  const optimal = tiers.find((t) => t.status === 'optimal');
  const normal = tiers.find((t) => t.status === 'normal');
  let mu: number;
  if (optimal) {
    const hi = Number.isFinite(optimal.max) && optimal.max < 9999 ? optimal.max : visualMax;
    mu = (optimal.min + Math.max(optimal.min, hi)) / 2;
  } else if (normal) {
    const hi = Number.isFinite(normal.max) && normal.max < 9999 ? normal.max : visualMax;
    mu = (normal.min + Math.max(normal.min, hi)) / 2;
  } else {
    mu = (visualMin + visualMax) / 2;
  }
  const sigma = Math.max(span * 0.19, 1e-6);
  const points = 56;
  const ys: number[] = [];
  for (let i = 0; i <= points; i++) {
    const v = visualMin + (i / points) * span;
    ys.push(Math.exp(-0.5 * Math.pow((v - mu) / sigma, 2)));
  }
  const peak = Math.max(...ys, 1e-9);
  const baseY = 92;
  const amp = 78;
  let d = '';
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * 100;
    const py = baseY - (ys[i]! / peak) * amp;
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${py.toFixed(2)} `;
  }
  d += `L 100 ${baseY} L 0 ${baseY} Z`;
  return d.trim();
}

function computeFoodSensitivityFlags(markers: BloodMarkers, profile?: UserProfile) {
  const flags: FoodSensitivityFlag[] = [];

  // --- Existing patterns ---

  if (
    markers.hsCRP !== undefined &&
    markers.hsCRP > 3 &&
    markers.alt !== undefined &&
    markers.alt > 45
  ) {
    flags.push({
      title: 'Inflammatory Diet Response Pattern',
      markers: `hs-CRP ${markers.hsCRP} + ALT ${markers.alt}`,
      suggestion:
        'This pattern can reflect systemic inflammation with liver stress. Consider reducing ultra-processed foods, alcohol, and high omega-6 seed oils; prioritize whole-food anti-inflammatory meals and discuss follow-up labs with your clinician.',
      severity: 'warning' as const,
    });
  }

  if (
    markers.ferritin !== undefined &&
    markers.ferritin < 30 &&
    markers.vitaminB12 !== undefined &&
    markers.vitaminB12 < 350
  ) {
    flags.push({
      title: 'Possible Absorption-Related Deficiency Pattern',
      markers: `Ferritin ${markers.ferritin} + B12 ${markers.vitaminB12}`,
      suggestion:
        'Low ferritin with low B12 may indicate intake or absorption issues. Consider discussing evaluation for gastrointestinal causes (including celiac screening) and building meals with iron + B12-rich foods.',
      severity: 'warning' as const,
    });
  }

  if (
    markers.triglycerides !== undefined &&
    markers.triglycerides > 150 &&
    markers.fastingInsulin !== undefined &&
    markers.fastingInsulin > 15
  ) {
    flags.push({
      title: 'Refined-Carb Sensitivity Pattern',
      markers: `Triglycerides ${markers.triglycerides} + Fasting insulin ${markers.fastingInsulin}`,
      suggestion:
        'This pattern often improves with lower refined carbohydrate load. Shift toward higher-fiber carbs, protein-forward meals, and post-meal walking to blunt glucose and insulin spikes.',
      severity: 'info' as const,
    });
  }

  // --- New marker-driven food recommendations ---

  // High LDL → soluble fiber + plant sterols
  if (markers.ldl !== undefined && markers.ldl >= 130) {
    flags.push({
      title: 'LDL Cholesterol — Dietary Action',
      markers: `LDL ${markers.ldl} mg/dL`,
      suggestion:
        'Prioritize soluble fiber (oats, beans, lentils, barley — aim for 10+ g/day), plant sterols (nuts, seeds, avocado), and fatty fish (2–3x/week). Limit saturated fat to <7% of calories.',
      severity: 'info' as const,
    });
  }

  // Low ferritin → heme iron sources
  if (markers.ferritin !== undefined && markers.ferritin < 30 && !(markers.vitaminB12 !== undefined && markers.vitaminB12 < 350)) {
    flags.push({
      title: 'Low Iron Stores — Dietary Action',
      markers: `Ferritin ${markers.ferritin} ng/mL`,
      suggestion:
        'Include heme iron sources (red meat 2–3x/week, poultry, shellfish) and pair plant iron (spinach, lentils) with vitamin C (citrus, bell peppers) to enhance absorption. Avoid tea/coffee with iron-rich meals.',
      severity: 'info' as const,
    });
  }

  // Elevated glucose/HbA1c → low-GI carb guidance
  if (
    (markers.glucose !== undefined && markers.glucose >= 100) ||
    (markers.hba1c !== undefined && markers.hba1c >= 5.7)
  ) {
    flags.push({
      title: 'Blood Sugar Management — Carb Quality',
      markers: [
        markers.glucose !== undefined ? `Glucose ${markers.glucose}` : '',
        markers.hba1c !== undefined ? `HbA1c ${markers.hba1c}%` : '',
      ].filter(Boolean).join(' + '),
      suggestion:
        'Favor low-glycemic carbs (sweet potatoes, legumes, steel-cut oats) over refined grains. Always pair carbs with protein or fat to slow glucose absorption. Consider eating carbs last in a meal (protein → vegetables → carbs).',
      severity: 'warning' as const,
    });
  }

  // High uric acid → purine management
  if (markers.uricAcid !== undefined && markers.uricAcid > 7.0) {
    flags.push({
      title: 'Elevated Uric Acid — Dietary Action',
      markers: `Uric acid ${markers.uricAcid} mg/dL`,
      suggestion:
        'Limit high-purine foods (organ meats, shellfish, beer), reduce fructose (soda, fruit juice), and increase water intake. Cherries and coffee may help lower uric acid levels.',
      severity: 'info' as const,
    });
  }

  // Low vitamin D → dietary sources
  if (markers.vitaminD !== undefined && markers.vitaminD < 30) {
    flags.push({
      title: 'Vitamin D — Dietary Support',
      markers: `Vitamin D ${markers.vitaminD} ng/mL`,
      suggestion:
        'Include vitamin D-rich foods: fatty fish (salmon, mackerel, sardines), egg yolks, fortified dairy/plant milk, and mushrooms exposed to UV light. Sun exposure (10–15 min midday) also helps.',
      severity: 'info' as const,
    });
  }

  // High hs-CRP (without liver flag already covered) → anti-inflammatory foods
  if (markers.hsCRP !== undefined && markers.hsCRP > 2.0 && !(markers.alt !== undefined && markers.alt > 45)) {
    flags.push({
      title: 'Elevated Inflammation — Anti-Inflammatory Diet',
      markers: `hs-CRP ${markers.hsCRP} mg/L`,
      suggestion:
        'Increase omega-3-rich foods (fatty fish, walnuts, flaxseed), colorful vegetables (berries, leafy greens, turmeric), and extra-virgin olive oil. Reduce processed foods, refined sugar, and excess omega-6 oils.',
      severity: 'info' as const,
    });
  }

  // Goal-specific food guidance
  if (profile) {
    if (profile.goal.startsWith('lose')) {
      flags.push({
        title: 'Weight Loss — Satiety-Focused Eating',
        markers: 'Goal: weight loss',
        suggestion:
          'Prioritize high-satiety foods: lean protein at every meal (30+ g), high-fiber vegetables, legumes, and whole grains. Eat slowly, plate food in advance, and front-load calories earlier in the day.',
        severity: 'info' as const,
      });
    } else if (profile.goal.startsWith('gain')) {
      flags.push({
        title: 'Muscle Gain — Calorie-Dense Nutrition',
        markers: 'Goal: muscle gain',
        suggestion:
          'Include calorie-dense nutrient-rich foods: nuts/nut butter, avocado, olive oil, whole eggs, dairy, and complex carbs (rice, potatoes, oats). Distribute protein across 4+ meals for optimal muscle protein synthesis.',
        severity: 'info' as const,
      });
    }
  }

  return flags;
}

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return value;
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

function RangeBar({
  markerKey,
  value,
  delay,
  gender,
  onOpenDetails,
}: {
  markerKey: keyof BloodMarkers;
  value: number;
  delay: number;
  gender?: UserProfile['gender'];
  onOpenDetails: (markerKey: keyof BloodMarkers, value: number) => void;
}) {
  const interp = getMarkerInterpretation(markerKey, value, gender);
  const style = getStatusTone(interp.status);
  const range = getMarkerDisplayRange(markerKey, gender);
  const segments = useMemo(() => getRangeSegments(markerKey, gender), [markerKey, gender]);
  const scale = useMemo(() => getMarkerBarScale(markerKey, gender), [markerKey, gender]);
  const needlePos = scale ? markerValueToBarPercent(value, scale) : 50;
  const tiers = useMemo(() => getMarkerTiers(markerKey, gender), [markerKey, gender]);

  const zoneGradient = useMemo(() => {
    const stops = segments.flatMap((seg) => {
      const tone = getStatusTone(seg.status);
      const lo = seg.left;
      const hi = Math.min(100, seg.left + seg.width);
      const mid = (lo + hi) / 2;
      const em = seg.status === interp.status ? 1 : 0.62;
      const edge = Math.round(em * 85);
      const core = Math.round(em * 72);
      return [
        `color-mix(in srgb, ${tone.fill} ${edge}%, var(--border-light)) ${lo}%`,
        `color-mix(in srgb, ${tone.fill} ${core}%, white) ${mid}%`,
        `color-mix(in srgb, ${tone.fill} ${edge}%, var(--border-light)) ${hi}%`,
      ];
    });
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }, [segments, interp.status]);

  const bellPath = useMemo(() => {
    if (!scale || tiers.length === 0) return '';
    return bellDistributionPath(scale.visualMin, scale.visualMax, tiers);
  }, [scale, tiers]);

  return (
    <button
      type="button"
      className="w-full text-left rounded-lg p-2.5 transition-colors"
      onClick={() => onOpenDetails(markerKey, value)}
      style={{
        backgroundColor: 'var(--bg-warm)',
        border: `1px solid ${style.fill}33`,
        boxShadow: `inset 0 0 0 1px ${style.fill}22`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {MARKER_NAMES[markerKey]}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[13px] font-semibold tabular-nums" style={{ color: style.fill }}>
            {value}
            <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {range?.unit}
            </span>
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
            style={{ color: style.fill, backgroundColor: style.bg, border: `1px solid ${style.fill}44` }}
          >
            {interp.label}
          </span>
        </div>
      </div>

      <div
        className="mt-2.5 relative h-[18px] rounded-full overflow-hidden"
        style={{
          backgroundColor: 'var(--border-light)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundImage: zoneGradient, backgroundColor: 'var(--border-light)' }}
        />
        {bellPath ? (
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d={bellPath} fill="var(--text-primary)" opacity={0.09} />
          </svg>
        ) : null}
        {segments.length > 1
          ? segments.slice(1).map((seg) => (
              <div
                key={`div-${seg.left}-${seg.label}`}
                className="absolute top-0 bottom-0 w-px pointer-events-none"
                style={{ left: `${seg.left}%`, backgroundColor: 'rgba(255,255,255,0.72)' }}
              />
            ))
          : null}
        <div
          className="absolute top-1/2 needle-pop z-[1]"
          style={{
            left: `${needlePos}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            animationDelay: `${delay}ms`,
          }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full border-2"
            style={{
              backgroundColor: style.fill,
              borderColor: 'var(--surface)',
              boxShadow: `0 0 0 2px ${style.fill}28, 0 2px 8px ${style.fill}45`,
            }}
          />
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{range?.min}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--status-normal)' }}>
          Reference &amp; risk zones
        </span>
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
          {range ? `${range.maxLabel} ${range.unit}` : ''}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[10px]">
        <div className="flex items-center gap-1.5" style={{ color: style.fill }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.fill }} />
          <span className="font-semibold uppercase tracking-[0.1em]">Current Status</span>
        </div>
        <span style={{ color: 'var(--text-tertiary)' }}>
          Tap for details
        </span>
      </div>
    </button>
  );
}

function CategoryCard({
  category, markers, score, delayBase, gender, onOpenDetails,
}: {
  category: (typeof CATEGORIES)[number];
  markers: BloodMarkers;
  score: number;
  delayBase: number;
  gender?: UserProfile['gender'];
  onOpenDetails: (markerKey: keyof BloodMarkers, value: number) => void;
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
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
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
      <div className="px-4 py-3 space-y-3">
        {present.map((key, i) => (
          <RangeBar
            key={key}
            markerKey={key}
            value={markers[key]!}
            delay={delayBase + i * 100}
            gender={gender}
            onOpenDetails={onOpenDetails}
          />
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
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        animationDelay: `${delay}ms`,
        boxShadow: insight.type === 'danger' ? `0 0 0 2px ${cfg.color}22` : undefined,
      }}
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

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: ResultsTab;
  active: boolean;
  onClick: (tab: ResultsTab) => void;
}) {
  const Icon = TAB_META[tab].icon;

  return (
    <button
      type="button"
      onClick={() => onClick(tab)}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
      style={{
        backgroundColor: active ? 'var(--text-primary)' : 'var(--bg-warm)',
        color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
        border: active ? '1px solid var(--text-primary)' : '1px solid var(--border-light)',
        boxShadow: active ? '0 10px 22px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {TAB_META[tab].label}
    </button>
  );
}

// ── Main Dashboard ──

export default function BloodTestDashboard({
  result,
  markers,
  profile,
  onReset,
  onEditProfile,
  resetLabel = 'New Analysis',
  showMedicalDisclaimer = true,
}: BloodTestDashboardProps) {
  const { isSignedIn } = useAuth();
  const { tdee, healthScore, insights, deficiencies, risks, calorieTiers, macros, recommendations } = result;
  const grade = getScoreGrade(healthScore.overall);
  const hasMarkers = Object.keys(markers).length > 0;
  const usedAverageMarkers = result.usedAverageMarkers === true;
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const foodFlags = computeFoodSensitivityFlags(markers, profile);
  const [activeMarker, setActiveMarker] = useState<{ key: keyof BloodMarkers; value: number } | null>(null);
  const [activeTab, setActiveTab] = useState<ResultsTab>('biomarkers');
  const animatedOverallScore = useCountUp(healthScore.overall, 1100);
  const countUpDidLogRef = useRef(false);

  const prioritizedInsights = useMemo(() => {
    const score = (insight: Insight) => {
      let total = 0;
      if (insight.type === 'danger') total += 100;
      else if (insight.type === 'warning') total += 70;
      else if (insight.type === 'success') total += 40;
      else total += 20;
      if (insight.recommendation) total += 25; // actionable over informational
      return total;
    };
    return [...insights].sort((a, b) => score(b) - score(a));
  }, [insights]);

  const actionableInsights = prioritizedInsights.filter((i) => i.recommendation);
  const informationalInsights = prioritizedInsights.filter((i) => !i.recommendation);
  const actionPlan = useMemo(
    () => result.actionPlan ?? deriveActionPlan(profile, markers, insights, deficiencies, risks),
    [result.actionPlan, profile, markers, insights, deficiencies, risks]
  );
  const populationBenchmarks = useMemo(
    () => derivePopulationBenchmarks(profile, markers),
    [profile, markers]
  );

  const topDrivers = useMemo(() => {
    const keys = Object.keys(MARKER_NAMES) as (keyof BloodMarkers)[];
    const scored = keys
      .filter((k) => markers[k] !== undefined)
      .map((k) => {
        const v = markers[k] as number;
        const interp = getMarkerInterpretation(k, v, profile.gender);
        const category = CATEGORIES.find((c) => c.markers.includes(k))?.label ?? 'Other';
        const unit = getMarkerUnit(k) ?? '';
        return {
          key: k,
          value: v,
          unit,
          category,
          label: interp.label,
          score: interp.score,
          impact: 100 - interp.score,
        };
      })
      .sort((a, b) => b.impact - a.impact);

    return scored.slice(0, 5);
  }, [markers, profile.gender]);

  const topDriversByCategory = useMemo(() => {
    const grouped: Record<string, typeof topDrivers> = {};
    for (const d of topDrivers) {
      if (!grouped[d.category]) grouped[d.category] = [];
      grouped[d.category].push(d);
    }
    return grouped;
  }, [topDrivers]);
  const visibleCategories = useMemo(
    () => CATEGORIES.filter((category) => category.markers.some((marker) => markers[marker] !== undefined)),
    [markers]
  );
  const visibleCategoriesByKey = useMemo(
    () => Object.fromEntries(visibleCategories.map((category) => [category.key, category])),
    [visibleCategories]
  );

  // #region debug logs for feature verification
  useEffect(() => {
    if (countUpDidLogRef.current) return;
    if (animatedOverallScore >= healthScore.overall && healthScore.overall > 0) {
      countUpDidLogRef.current = true;
      debugLog({
        hypothesisId: 'Q11_score_countup',
        location: 'components/BloodTestDashboard.tsx:score_countup_complete',
        message: 'Score count-up reached target',
        data: { target: healthScore.overall, final: animatedOverallScore },
      });
    }
  }, [animatedOverallScore, healthScore.overall]);

  useEffect(() => {
    debugLog({
      hypothesisId: 'Q13_insight_sort',
      location: 'components/BloodTestDashboard.tsx:prioritized_insights',
      message: 'Insights prioritized & grouped',
      data: {
        total: prioritizedInsights.length,
        actionable: actionableInsights.length,
        informational: informationalInsights.length,
      },
    });
  }, [prioritizedInsights.length, actionableInsights.length, informationalInsights.length]);
  // #endregion

  const handleOpenMarkerDetails = (key: keyof BloodMarkers, value: number) => {
    debugLog({
      hypothesisId: 'Q12_marker_detail',
      location: 'components/BloodTestDashboard.tsx:open_marker_details',
      message: 'Opened marker detail drawer',
      data: { marker: key, value },
    });
    setActiveMarker({ key, value });
  };

  const handleDownloadPDF = async () => {
    setDownloadError(null);
    const pdfEl = document.getElementById('pdf-content');
    const screenEl = document.getElementById('screen-content');
    if (!(pdfEl instanceof HTMLElement)) return;

    const mod: any = await import('html2pdf.js');
    const html2pdf = mod?.default ?? mod;

    const prevPdfDisplay = pdfEl.style.display;
    const prevScreenDisplay = screenEl instanceof HTMLElement ? screenEl.style.display : undefined;

    try {
      // Make sure the element we're capturing is actually rendered (not display:none).
      pdfEl.style.display = 'block';
      if (screenEl instanceof HTMLElement) screenEl.style.display = 'none';

      // Allow the browser to reflow/layout before snapshotting.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      await html2pdf()
        .from(pdfEl)
        .set({
          margin: 0.5,
          filename: 'BetterCals_Report.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['.pdf-avoid-break', 'tr'],
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
          },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .save();
    } catch (err) {
      console.error('PDF generation failed', err);
      setDownloadError('PDF generation failed. Please try again.');
    } finally {
      pdfEl.style.display = prevPdfDisplay;
      if (screenEl instanceof HTMLElement) screenEl.style.display = prevScreenDisplay ?? '';
    }
  };

  const handleDownloadCSV = () => {
    const markerNames: Record<string, string> = {
      glucose: 'Glucose (mg/dL)', hba1c: 'HbA1c (%)', totalCholesterol: 'Total Cholesterol (mg/dL)',
      ldl: 'LDL (mg/dL)', hdl: 'HDL (mg/dL)', triglycerides: 'Triglycerides (mg/dL)',
      apoB: 'ApoB (mg/dL)', hsCRP: 'hs-CRP (mg/L)', tsh: 'TSH (mIU/L)',
      vitaminD: 'Vitamin D (ng/mL)', vitaminB12: 'Vitamin B12 (pg/mL)', ferritin: 'Ferritin (ng/mL)',
      iron: 'Iron (mcg/dL)', alt: 'ALT (U/L)', ast: 'AST (U/L)', albumin: 'Albumin (g/dL)',
      creatinine: 'Creatinine (mg/dL)', uricAcid: 'Uric Acid (mg/dL)', fastingInsulin: 'Fasting Insulin (mIU/L)',
      nonHdl: 'Non-HDL (mg/dL)',
    };
    const rows: string[] = ['Marker,Value,Status'];
    for (const [key, value] of Object.entries(markers)) {
      if (value === undefined) continue;
      const interp = getMarkerInterpretation(key as keyof BloodMarkers, value as number, profile.gender);
      const name = markerNames[key] ?? key;
      rows.push(`"${name}",${value},"${interp.label}"`);
    }
    rows.push('');
    rows.push('Metric,Value');
    rows.push(`BMR,${tdee.bmr}`);
    rows.push(`TDEE,${tdee.tdee}`);
    rows.push(`Target Calories,${tdee.targetCalories}`);
    rows.push(`Overall Health Score,${healthScore.overall}`);
    rows.push(`BMI,${recommendations.bmi}`);
    rows.push(`Protein (g),${macros.protein.grams}`);
    rows.push(`Carbs (g),${macros.carbs.grams}`);
    rows.push(`Fat (g),${macros.fat.grams}`);

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BetterCals_Report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      profile,
      markers,
      result,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BetterCals_Report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToHistory = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, markers, result }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(true);
        if (data?.id) setSavedAnalysisId(data.id);
      } else {
        console.error('Save failed:', await res.text());
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!savedAnalysisId) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/analyses/${savedAnalysisId}/share`, { method: 'POST' });
      if (res.ok) {
        const { shareToken } = await res.json();
        const url = `${window.location.origin}/shared/${shareToken}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
      } else {
        console.error('Share failed:', await res.text());
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const markerRows = (Object.keys(MARKER_NAMES) as (keyof BloodMarkers)[])
    .filter((k) => markers[k] !== undefined)
    .map((k) => {
      const value = markers[k]!;
      const interp = getMarkerInterpretation(k, value, profile.gender);
      const unit = getMarkerUnit(k) ?? '';
      return { key: k, name: MARKER_NAMES[k], value, unit, status: interp.status, label: interp.label, score: interp.score };
    });

  const ratioRows: { label: string; value: string; interpretation: string }[] = [];
  if (recommendations.ldlHdlRatio !== null && recommendations.ldlHdlInterpretation) {
    ratioRows.push({
      label: 'LDL/HDL Ratio',
      value: `${recommendations.ldlHdlRatio}`,
      interpretation: recommendations.ldlHdlInterpretation,
    });
  }
  if (recommendations.tgHdlRatio !== null && recommendations.tgHdlInterpretation) {
    ratioRows.push({
      label: 'TG/HDL Ratio',
      value: `${recommendations.tgHdlRatio}`,
      interpretation: recommendations.tgHdlInterpretation,
    });
  }

  const ascvdDisplay = result.ascvdRiskScore != null ? `${result.ascvdRiskScore.toFixed(1)}%` : 'N/A';
  const availableTabs = useMemo(() => {
    const tabs: ResultsTab[] = [];
    if (hasMarkers) tabs.push('biomarkers');
    if (!usedAverageMarkers) tabs.push('recommendations');
    if (!usedAverageMarkers && (prioritizedInsights.length > 0 || deficiencies.length > 0 || risks.length > 0)) tabs.push('insights');
    if (hasMarkers) tabs.push('trends');
    return tabs;
  }, [hasMarkers, usedAverageMarkers, prioritizedInsights.length, deficiencies.length, risks.length]);
  const displayedTab = availableTabs.includes(activeTab) ? activeTab : (availableTabs[0] ?? 'biomarkers');

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
        <div className="max-w-5xl mx-auto px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-sm font-medium group btn-press shrink-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" style={{ color: 'var(--text-tertiary)' }} />
              <span className="hidden sm:inline">{resetLabel}</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press"
                style={{
                  backgroundColor: 'var(--border-light)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                title="Download PDF report"
              >
                <Download className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press"
                style={{
                  backgroundColor: 'var(--border-light)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                title="Download CSV spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press"
                style={{
                  backgroundColor: 'var(--border-light)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                title="Download JSON data"
              >
                <FileJson className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <span className="hidden sm:inline">JSON</span>
              </button>

              {isSignedIn ? (
                <>
                  <Link
                    href="/history"
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press"
                    style={{
                      backgroundColor: 'var(--border-light)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <History className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="hidden sm:inline">History</span>
                  </Link>
                  <button
                    onClick={handleSaveToHistory}
                    disabled={saving || saved}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press disabled:opacity-50"
                    style={{
                      backgroundColor: saved ? 'var(--status-normal-bg)' : 'var(--border-light)',
                      color: saved ? 'var(--status-normal)' : 'var(--text-primary)',
                      border: `1px solid ${saved ? 'var(--status-normal-border)' : 'var(--border)'}`,
                    }}
                  >
                    {saved ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    )}
                    <span className="hidden sm:inline">{saving ? 'Saving...' : saved ? 'Saved' : 'Save to History'}</span>
                  </button>
                  {saved && savedAnalysisId && (
                    <button
                      onClick={handleShare}
                      disabled={sharing}
                      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press disabled:opacity-50"
                      style={{
                        backgroundColor: shareUrl ? 'var(--status-normal-bg)' : 'var(--border-light)',
                        color: shareUrl ? 'var(--status-normal)' : 'var(--text-primary)',
                        border: `1px solid ${shareUrl ? 'var(--status-normal-border)' : 'var(--border)'}`,
                      }}
                    >
                      {shareUrl ? (
                        <LinkIcon className="w-4 h-4" />
                      ) : (
                        <Share2 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      )}
                      <span className="hidden sm:inline">
                        {sharing ? 'Sharing...' : shareUrl ? 'Link Copied!' : 'Share'}
                      </span>
                    </button>
                  )}
                  {onEditProfile && (
                    <ProfileDropdown profile={profile} onEditProfile={onEditProfile} />
                  )}
                </>
              ) : (
                <Link
                  href="/sign-in"
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--text-inverse)',
                    border: '1px solid var(--accent)',
                  }}
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign in to Save</span>
                </Link>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-[14px] flex items-center justify-center"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #d2d2cc',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                  }}
                >
                  <VitalsMark sizePx={22} />
                </div>
                <span className="hidden sm:inline text-sm font-bold font-display" style={{ color: 'var(--text-primary)' }}>BetterCals</span>
              </div>
            </div>
          </div>

          {downloadError ? (
            <div className="mt-2 text-xs font-semibold" style={{ color: 'var(--status-danger)' }}>
              {downloadError}
            </div>
          ) : null}
        </div>
      </div>

      {/* PDF-only, print-friendly content (hidden on screen) */}
      <div
        id="pdf-content"
        style={{
          display: 'none',
          width: '7.5in',
          maxWidth: '7.5in',
          margin: '0 auto',
          padding: '0.25in',
          boxSizing: 'border-box',
          background: '#ffffff',
          color: '#111111',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <style>{`
          #pdf-content .pdf-avoid-break { break-inside: avoid; page-break-inside: avoid; }
          #pdf-content table { break-inside: auto; page-break-inside: auto; }
          #pdf-content thead { display: table-header-group; }
          #pdf-content tr { break-inside: avoid; page-break-inside: avoid; }
        `}</style>

        <div className="pdf-avoid-break" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>BetterCals Report</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              Generated {new Date().toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#555' }}>Overall Health Score</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{healthScore.overall}/100</div>
          </div>
        </div>

        <div style={{ height: 1, background: '#e5e5e5', margin: '14px 0' }} />

        <div className="pdf-avoid-break" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="pdf-avoid-break" style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Profile</div>
            <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
              Age: <b>{profile.age}</b><br />
              Sex: <b>{profile.gender}</b><br />
              Weight: <b>{profile.weightLbs} lb</b><br />
              Height: <b>{`${profile.heightFeet}'${profile.heightInches}"`}</b><br />
              Goal: <b>{profile.goal}</b>
            </div>
          </div>

          <div className="pdf-avoid-break" style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Calories</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#555' }}>BMR</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{tdee.bmr.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#555' }}>TDEE</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{tdee.tdee.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#555' }}>Target</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{tdee.targetCalories.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#555' }}>BMI</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{recommendations.bmi} ({recommendations.bmiCategory})</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pdf-avoid-break" style={{ marginTop: 14, border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Scores</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 8 }}>
            <div><div style={{ fontSize: 10, color: '#666' }}>Metabolic</div><div style={{ fontSize: 14, fontWeight: 800 }}>{healthScore.metabolic}</div></div>
            <div><div style={{ fontSize: 10, color: '#666' }}>Cardiovascular</div><div style={{ fontSize: 14, fontWeight: 800 }}>{healthScore.cardiovascular}</div></div>
            <div><div style={{ fontSize: 10, color: '#666' }}>Hormonal</div><div style={{ fontSize: 14, fontWeight: 800 }}>{healthScore.hormonal}</div></div>
            <div><div style={{ fontSize: 10, color: '#666' }}>Nutritional</div><div style={{ fontSize: 14, fontWeight: 800 }}>{healthScore.nutritional}</div></div>
          </div>
        </div>

        {topDrivers.length > 0 && (
          <div className="pdf-avoid-break" style={{ marginTop: 14, border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Top Drivers</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {Object.entries(topDriversByCategory).map(([cat, items]) => (
                <div key={cat} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>{cat}</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {items.map((d) => (
                      <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 11, color: '#333' }}>{MARKER_NAMES[d.key]}</div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{d.value}{d.unit ? ` ${d.unit}` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pdf-avoid-break" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="pdf-avoid-break" style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>ASCVD 10-Year Risk</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{ascvdDisplay}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
              Framingham General CVD estimate; strata align with ACC/AHA-oriented prevention categories (when eligible).
            </div>
          </div>

          <div className="pdf-avoid-break" style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Key Ratios</div>
            {ratioRows.length === 0 ? (
              <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Not available (requires lipid values).</div>
            ) : (
              <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                {ratioRows.map((r) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: 11, color: '#333' }}>{r.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{r.value} — {r.interpretation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pdf-avoid-break" style={{ marginTop: 14, border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Blood Markers</div>
          {markerRows.length === 0 ? (
            <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>No markers provided.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 11 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#666' }}>
                  <th style={{ padding: '6px 4px', borderBottom: '1px solid #e5e5e5' }}>Marker</th>
                  <th style={{ padding: '6px 4px', borderBottom: '1px solid #e5e5e5' }}>Value</th>
                  <th style={{ padding: '6px 4px', borderBottom: '1px solid #e5e5e5' }}>Interpretation</th>
                  <th style={{ padding: '6px 4px', borderBottom: '1px solid #e5e5e5' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {markerRows.map((r) => (
                  <tr key={r.name} className="pdf-avoid-break">
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #f0f0f0' }}>{r.name}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #f0f0f0' }}>{r.value} {r.unit}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #f0f0f0' }}>{r.label}</td>
                    <td style={{ padding: '6px 4px', borderBottom: '1px solid #f0f0f0' }}>{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!usedAverageMarkers && (deficiencies.length > 0 || risks.length > 0) && (
          <div className="pdf-avoid-break" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="pdf-avoid-break" style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Potential Deficiencies</div>
              <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 11, color: '#333' }}>
                {deficiencies.map((d) => <li key={d} style={{ marginBottom: 4 }}>{d}</li>)}
              </ul>
            </div>
            <div className="pdf-avoid-break" style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Health Risks</div>
              <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 11, color: '#333' }}>
                {risks.map((r) => <li key={r} style={{ marginBottom: 4 }}>{r}</li>)}
              </ul>
            </div>
          </div>
        )}

        {!usedAverageMarkers && insights.length > 0 && (
          <div className="pdf-avoid-break" style={{ marginTop: 14, border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Insights</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {insights.slice(0, 10).map((i) => {
                const insightKey = `${i.type}:${i.title}:${i.description}:${i.recommendation ?? ''}`;
                return (
                  <div key={insightKey} className="pdf-avoid-break" style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>{i.title}</div>
                    <div style={{ fontSize: 11, color: '#333', marginTop: 4 }}>{i.description}</div>
                    {i.recommendation && <div style={{ fontSize: 10, color: '#666', marginTop: 6 }}>{i.recommendation}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 9, color: '#777' }}>
          Disclaimer: BetterCals provides estimates for informational purposes only and is not medical advice.
        </div>
      </div>

      {/* Screen UI */}
      <div id="screen-content" className="max-w-5xl mx-auto px-4 sm:px-5 pt-6 sm:pt-8">
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

            <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 sm:gap-8 p-4 sm:p-6 md:p-8">
              {hasMarkers && (
                <div className="flex flex-col items-center justify-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    Health Score
                  </p>
                  <ScoreRing score={animatedOverallScore} />
                  {topDrivers.length > 0 && (
                    <div
                      className="mt-5 rounded-xl p-4 w-full"
                      style={{
                        backgroundColor: 'var(--bg-warm)',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Top Drivers
                        </h3>
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                          Biggest score drag
                        </span>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(topDriversByCategory).map(([cat, items]) => (
                          <div key={cat}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>
                              {cat}
                            </p>
                            <div className="mt-2 space-y-1">
                              {items.map((d) => (
                                <div key={d.key} className="flex items-start justify-between gap-3">
                                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    {MARKER_NAMES[d.key]}
                                  </span>
                                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                    {d.value}
                                    <span className="text-[10px] font-normal" style={{ color: 'var(--text-tertiary)' }}>
                                      {d.unit ? ` ${d.unit}` : ''}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                      backgroundColor: `${getScoreGrade(getBmiScore(recommendations.bmi)).color}12`,
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Jump To Section
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableTabs.map((tab) => (
                      <TabButton key={tab} tab={tab} active={displayedTab === tab} onClick={setActiveTab} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 anim-fade-up delay-2">
          <TechnicalMethodology />
        </div>

        {displayedTab === 'biomarkers' && hasMarkers && (
          <>
            {!usedAverageMarkers && populationBenchmarks.length > 0 && (
              <div className="mt-8 anim-fade-up delay-2">
                <PopulationBenchmarksCard benchmarks={populationBenchmarks} />
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start xl:hidden">
              {visibleCategories.map((cat, i) => (
                <div key={cat.key} className={`anim-fade-up delay-${i + 3}`}>
                  <CategoryCard
                    category={cat}
                    markers={markers}
                    score={healthScore[cat.scoreKey]}
                    delayBase={400 + i * 150}
                    gender={profile.gender}
                    onOpenDetails={handleOpenMarkerDetails}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 hidden xl:grid xl:grid-cols-3 gap-4 items-start">
              {BIOMARKER_COLUMNS.map((column, columnIndex) => (
                <div key={`column-${columnIndex}`} className="space-y-4">
                  {column.map((categoryKey, itemIndex) => {
                    const category = visibleCategoriesByKey[categoryKey];
                    if (!category) return null;
                    return (
                      <div key={category.key} className={`anim-fade-up delay-${columnIndex + itemIndex + 3}`}>
                        <CategoryCard
                          category={category}
                          markers={markers}
                          score={healthScore[category.scoreKey]}
                          delayBase={400 + (columnIndex * 2 + itemIndex) * 150}
                          gender={profile.gender}
                          onOpenDetails={handleOpenMarkerDetails}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {displayedTab === 'recommendations' && !usedAverageMarkers && (
          <>
            <div className="mt-8 anim-fade-up delay-2">
              <ActionPlanCard items={actionPlan} />
            </div>
            <div className="mt-8 anim-fade-up delay-3">
              <RecommendationsPanel recs={recommendations} tdee={tdee} />
            </div>
            <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-5 anim-fade-up delay-4">
              <CalorieTiersCard
                tiers={calorieTiers}
                userGoal={profile.goal}
                targetCalories={tdee.targetCalories}
              />
              <div className="space-y-3">
                {macros.recompMode && (
                  <div
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--status-info-bg)',
                      border: '1px solid var(--status-info-border)',
                      color: 'var(--status-info)',
                    }}
                  >
                    Body recomposition — prioritize protein and training
                  </div>
                )}
                <MacroDonutChart macros={macros} />
              </div>
            </div>
            {foodFlags.length > 0 && (
              <div className="mt-8 anim-fade-up delay-5">
                <FoodSensitivityCard flags={foodFlags} />
              </div>
            )}
          </>
        )}

        {displayedTab === 'insights' && !usedAverageMarkers && (
          <div className="mt-8 anim-fade-up">
            {(deficiencies.length > 0 || risks.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FlagSection title="Potential Deficiencies" items={deficiencies} variant="warning" />
                <FlagSection title="Health Risks" items={risks} variant="danger" />
              </div>
            )}

            {prioritizedInsights.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-xl mb-4" style={{ color: 'var(--text-primary)' }}>
                  Insights & Recommendations
                </h2>
                <div className="space-y-4">
                  {actionableInsights.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        Actionable
                      </h3>
                      <div className="space-y-3">
                        {actionableInsights.map((insight, i) => (
                          <InsightCard key={`act-${i}`} insight={insight} delay={600 + i * 80} />
                        ))}
                      </div>
                    </div>
                  )}
                  {informationalInsights.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        Informational
                      </h3>
                      <div className="space-y-3">
                        {informationalInsights.map((insight, i) => (
                          <InsightCard key={`info-${i}`} insight={insight} delay={800 + i * 80} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {displayedTab === 'trends' && hasMarkers && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5 anim-fade-up delay-2">
            <div className="md:col-span-1 h-full">
              <HealthRadarChart healthScore={healthScore} />
            </div>
            <div className="md:col-span-1 h-full">
              <ASCVDRiskCard
                ascvdRiskScore={result.ascvdRiskScore}
                ascvdRiskReason={result.ascvdRiskReason}
                age={profile.age}
                hasLipids={markers.totalCholesterol !== undefined && markers.hdl !== undefined}
                familyHistoryDisclaimer={
                  result.ascvdRiskScore !== undefined && profile.familyHeartDisease === true
                }
                hrtDisclaimer={
                  result.ascvdRiskScore !== undefined &&
                  profile.gender === 'female' &&
                  profile.takingHRT === true
                }
              />
            </div>
            <div className="md:col-span-1 h-full">
              <RestingHeartRateCard
                restingHeartRate={profile.restingHeartRate}
                activityLevel={profile.activityLevel}
              />
            </div>
            <div className="md:col-span-3">
              <MarkerComparisonChart markers={markers} profile={{ age: profile.age, gender: profile.gender }} />
            </div>
          </div>
        )}

        {/* 11. Footer — medical disclaimer (omit section when showMedicalDisclaimer is false) */}
        {showMedicalDisclaimer && (
          <div className="mt-12 pt-6 anim-fade-up" style={{ borderTop: '1px solid var(--border-light)' }}>
            <MedicalDisclaimer className="text-left" />
          </div>
        )}
      </div>

      <MarkerEducationDrawer
        open={activeMarker !== null}
        markerKey={activeMarker?.key ?? null}
        value={activeMarker?.value ?? null}
        onClose={() => setActiveMarker(null)}
      />
    </div>
  );
}
