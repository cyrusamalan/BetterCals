'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnalysisResult, BloodMarkers, CoachHistorySource, CoachMessage, CoachPlan, CoachProviderTelemetry, FoodSensitivityFlag, Insight, MarkerStatus, UserProfile } from '@/types';
import {
  getMarkerBarScale,
  getMarkerDisplayRange,
  getMarkerInterpretation,
  getMarkerTiers,
  getMarkerUnit,
  markerValueToBarPercent,
} from '@/lib/bloodParser';
import MarkerHoverPopup from '@/components/dashboard/MarkerHoverPopup';
import {
  Heart,
  Flame,
  Activity,
  Download,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
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
  MessageCircle,
  Mic,
  MicOff,
} from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import BrandHeaderMark from '@/components/BrandHeaderMark';
import ProfileDropdown from '@/components/ProfileDropdown';
import CalorieTiersCard from '@/components/dashboard/CalorieTiersCard';
import RecommendationsPanel from '@/components/dashboard/RecommendationsPanel';
import ASCVDRiskCard from '@/components/dashboard/ASCVDRiskCard';
import BioAgeCard from '@/components/dashboard/BioAgeCard';
import RestingHeartRateCard from '@/components/dashboard/RestingHeartRateCard';
import FoodSensitivityCard from '@/components/dashboard/FoodSensitivityCard';
import ActionPlanCard from '@/components/dashboard/ActionPlanCard';
import DietPlanCard from '@/components/dashboard/DietPlanCard';
import PopulationBenchmarksCard from '@/components/dashboard/PopulationBenchmarksCard';
import { deriveActionPlan, derivePopulationBenchmarks } from '@/lib/derivedInsights';
import { debugLog } from '@/lib/debugLog';
import { MARKER_NAMES } from '@/lib/calculations';
import { calculatePhenoAge } from '@/lib/phenoAge';

import { SkeletonChart } from '@/components/dashboard/Skeleton';
import TechnicalMethodology from '@/components/TechnicalMethodology';
import MedicalDisclaimer from '@/components/MedicalDisclaimer';

const MacroDonutChart = dynamic(() => import('@/components/dashboard/MacroDonutChart'), { ssr: false, loading: () => <SkeletonChart /> });
const HealthRadarChart = dynamic(() => import('@/components/dashboard/HealthRadarChart'), { ssr: false, loading: () => <SkeletonChart /> });
const MarkerComparisonChart = dynamic(() => import('@/components/dashboard/MarkerComparisonChart'), { ssr: false, loading: () => <SkeletonChart /> });

type LiveServerMessage = {
  setupComplete?: Record<string, never>;
  error?: { message?: string };
  turnComplete?: boolean;
  interrupted?: boolean;
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
    interrupted?: boolean;
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  };
};

const LIVE_SAMPLE_RATE = 16000;
const LIVE_HISTORY_MIN_WORDS = 2;

function floatTo16BitPcm(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function downsampleTo16k(input: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === LIVE_SAMPLE_RATE) return input;
  const ratio = sourceRate / LIVE_SAMPLE_RATE;
  const newLength = Math.round(input.length / ratio);
  const output = new Float32Array(newLength);
  let offset = 0;
  for (let i = 0; i < newLength; i += 1) {
    const nextOffset = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = offset; j < nextOffset && j < input.length; j += 1) {
      sum += input[j];
      count += 1;
    }
    output[i] = count > 0 ? sum / count : 0;
    offset = nextOffset;
  }
  return output;
}

function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.length * 2);
  for (let i = 0; i < pcm.length; i += 1) {
    const value = pcm[i];
    bytes[i * 2] = value & 0xff;
    bytes[i * 2 + 1] = (value >> 8) & 0xff;
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToPcm(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm = new Int16Array(bytes.length / 2);
  for (let i = 0; i < pcm.length; i += 1) {
    pcm[i] = (bytes[i * 2 + 1] << 8) | bytes[i * 2];
  }
  return pcm;
}

function sampleRateFromMimeType(mimeType?: string): number {
  if (!mimeType) return 24000;
  const match = mimeType.match(/rate=(\d+)/i);
  if (!match) return 24000;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24000;
}

function mergeTranscriptSegments(existing: string, incoming: string): string {
  const base = existing.trim();
  const next = incoming.trim();
  if (!next) return base;
  if (!base) return next;
  if (next.startsWith(base)) return next;
  if (base.endsWith(next)) return base;
  return `${base} ${next}`.replace(/\s+/g, ' ').trim();
}

function TypewriterText({
  text,
  alreadyTyped,
  speed = 16,
  onDone,
}: {
  text: string;
  alreadyTyped: boolean;
  speed?: number;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(alreadyTyped ? text.length : 0);

  useEffect(() => {
    if (alreadyTyped) return;
    if (idx >= text.length) {
      onDone();
      return;
    }
    const step = /\s/.test(text[idx]) ? speed * 0.6 : speed;
    const t = setTimeout(() => setIdx((i) => i + 1), step);
    return () => clearTimeout(t);
  }, [idx, text, speed, alreadyTyped, onDone]);

  const typing = !alreadyTyped && idx < text.length;
  return (
    <>
      {text.slice(0, idx)}
      {typing && <span className="coach-typewriter-caret">▍</span>}
    </>
  );
}

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
  onOpenDetails: (markerKey: keyof BloodMarkers, value: number, rect: DOMRect | null) => void;
}) {
  const interp = getMarkerInterpretation(markerKey, value, gender);
  const style = getStatusTone(interp.status);
  const range = getMarkerDisplayRange(markerKey, gender);
  const segments = useMemo(() => getRangeSegments(markerKey, gender), [markerKey, gender]);
  const scale = useMemo(() => getMarkerBarScale(markerKey, gender), [markerKey, gender]);
  const needlePos = scale ? markerValueToBarPercent(value, scale) : 50;
  const tiers = useMemo(() => getMarkerTiers(markerKey, gender), [markerKey, gender]);
  const hoverTimerRef = useRef<number | null>(null);

  const startHover = (el: HTMLElement) => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      onOpenDetails(markerKey, value, el.getBoundingClientRect());
      hoverTimerRef.current = null;
    }, 1000);
  };

  const cancelHover = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    onOpenDetails(markerKey, value, null);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    };
  }, []);

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
    <div
      role="button"
      tabIndex={0}
      className="marker-hover w-full text-left rounded-lg p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      onMouseEnter={(e) => startHover(e.currentTarget)}
      onMouseLeave={cancelHover}
      onFocus={(e) => startHover(e.currentTarget)}
      onBlur={cancelHover}
      style={{
        ['--marker-hover-color' as string]: style.fill,
        backgroundColor: 'var(--bg-warm)',
        border: `1px solid ${style.fill}33`,
        boxShadow: `inset 0 0 0 1px ${style.fill}22`,
        cursor: 'default',
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
          Hover for details
        </span>
      </div>
    </div>
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
  onOpenDetails: (markerKey: keyof BloodMarkers, value: number, rect: DOMRect | null) => void;
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
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
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
  const [dietPlan, setDietPlan] = useState(result.dietPlan);
  const grade = getScoreGrade(healthScore.overall);
  const hasMarkers = Object.keys(markers).length > 0;
  const usedAverageMarkers = result.usedAverageMarkers === true;
  const estimatedFromQuestionnaire = result.estimatedFromQuestionnaire === true;
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const foodFlags = computeFoodSensitivityFlags(markers, profile);
  const [activeMarker, setActiveMarker] = useState<{ key: keyof BloodMarkers; value: number; rect: DOMRect } | null>(null);
  const [activeTab, setActiveTab] = useState<ResultsTab>('biomarkers');
  const [coachPlan, setCoachPlan] = useState<CoachPlan | null>(result.coach?.plan ?? null);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>(result.coach?.messages ?? []);
  const [coachTelemetry, setCoachTelemetry] = useState<CoachProviderTelemetry[]>(result.coach?.telemetry ?? []);
  const [coachInput, setCoachInput] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachListening, setCoachListening] = useState(false);
  const [coachLiveTranscript, setCoachLiveTranscript] = useState('Live voice ready');
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachClosing, setCoachClosing] = useState(false);
  const [coachInitAttempted, setCoachInitAttempted] = useState(Boolean(result.coach?.plan));
  const typedMessageIdsRef = useRef<Set<string>>(new Set());
  const liveSocketRef = useRef<WebSocket | null>(null);
  const liveAudioContextRef = useRef<AudioContext | null>(null);
  const liveSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const liveProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const liveSilentSinkRef = useRef<GainNode | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const livePlaybackStartAtRef = useRef(0);
  const liveAssistantMessageIdRef = useRef<string | null>(null);
  const liveReconnectAllowedRef = useRef(false);
  const liveSetupCompleteRef = useRef(false);
  const liveHistoryRef = useRef<Partial<Record<CoachHistorySource, { text: string; at: number }>>>({});
  const liveTurnRef = useRef<{ userText: string; modelText: string }>({ userText: '', modelText: '' });
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (coachPlan || coachInitAttempted) return;
    let cancelled = false;

    async function loadCoachInitial() {
      setCoachLoading(true);
      setCoachError(null);
      try {
        const res = await fetch('/api/coach/initial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile, markers, result }),
        });
        if (!res.ok) {
          throw new Error(`Failed to create coach plan (${res.status})`);
        }
        const data = await res.json() as { plan: CoachPlan; initialMessage: CoachMessage };
        if (cancelled) return;
        setCoachPlan(data.plan);
        setCoachMessages((prev) => (prev.length > 0 ? prev : [data.initialMessage]));
      } catch (err) {
        if (cancelled) return;
        setCoachError(err instanceof Error ? err.message : 'Could not load coach');
      } finally {
        if (!cancelled) {
          setCoachLoading(false);
          setCoachInitAttempted(true);
        }
      }
    }

    loadCoachInitial();
    return () => {
      cancelled = true;
    };
  }, [coachPlan, coachInitAttempted, profile, markers, result]);

  const handleOpenMarkerDetails = (
    key: keyof BloodMarkers,
    value: number,
    rect: DOMRect | null,
  ) => {
    if (!rect) {
      setActiveMarker(null);
      return;
    }
    debugLog({
      hypothesisId: 'Q12_marker_detail',
      location: 'components/BloodTestDashboard.tsx:open_marker_details',
      message: 'Opened marker detail popup',
      data: { marker: key, value },
    });
    setActiveMarker({ key, value, rect });
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
      lymphocytePct: 'Lymphocytes (%)', mcv: 'MCV (fL)', rdw: 'RDW (%)',
      alkalinePhosphatase: 'Alkaline Phosphatase (U/L)', whiteBloodCells: 'WBC (K/µL)',
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
    if (phenoAgeSnapshot) {
      rows.push('');
      rows.push('Biological Age,Value');
      rows.push(`PhenoAge (years),${phenoAgeSnapshot.phenoAge}`);
      rows.push(`Chronological Age (years),${phenoAgeSnapshot.chronologicalAge}`);
      rows.push(`Delta (years),${phenoAgeSnapshot.delta}`);
      rows.push(`10-Year Mortality Score,${phenoAgeSnapshot.mortalityScore.toFixed(4)}`);
      rows.push(`Used Population Estimates,${phenoAgeSnapshot.usedEstimates ? 'yes' : 'no'}`);
    }

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
      phenoAge: phenoAgeSnapshot,
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
        body: JSON.stringify({
          profile,
          markers,
          result: dietPlan ? { ...result, dietPlan } : result,
          coach: coachState,
        }),
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

  const persistCoachHistoryEvent = async (
    source: CoachHistorySource,
    role: 'assistant' | 'user',
    message: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!isSignedIn) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/coach/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          role,
          message: trimmed,
          analysisId: savedAnalysisId ?? undefined,
          metadata,
        }),
      });
      if (!res.ok) {
        const details = await res.text();
        console.warn('[coach/history] event persistence failed (non-blocking):', res.status, details);
      }
    } catch (error) {
      console.warn('[coach/history] event persistence failed (non-blocking):', error);
    }
  };

  const captureLiveTranscript = (
    source: Extract<CoachHistorySource, 'live_mic' | 'live_model'>,
    text: string,
  ) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    const now = Date.now();
    const prev = liveHistoryRef.current[source];
    if (prev && prev.text === trimmed && now - prev.at < 1500) return;
    liveHistoryRef.current[source] = { text: trimmed, at: now };
    if (source === 'live_mic') {
      liveTurnRef.current.userText = mergeTranscriptSegments(liveTurnRef.current.userText, trimmed);
    } else {
      liveTurnRef.current.modelText = mergeTranscriptSegments(liveTurnRef.current.modelText, trimmed);
    }
  };

  const flushLiveTurnHistory = (flushReason: 'turn_complete' | 'session_end' | 'interrupted') => {
    const persistIfValid = (
      source: Extract<CoachHistorySource, 'live_mic' | 'live_model'>,
      role: 'assistant' | 'user',
      text: string,
    ) => {
      const normalized = text.replace(/\s+/g, ' ').trim();
      if (!normalized) return;
      const wordCount = normalized.split(/\s+/).filter(Boolean).length;
      if (wordCount < LIVE_HISTORY_MIN_WORDS) return;
      void persistCoachHistoryEvent(source, role, normalized, {
        liveTurn: true,
        flushReason,
        wordCount,
      });
    };

    persistIfValid('live_mic', 'user', liveTurnRef.current.userText);
    persistIfValid('live_model', 'assistant', liveTurnRef.current.modelText);
    liveTurnRef.current.userText = '';
    liveTurnRef.current.modelText = '';
  };

  const sendCoachQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || !coachPlan || coachLoading) return;

    const userMessage: CoachMessage = {
      id: `coach-user-${Date.now()}`,
      role: 'user',
      source: 'llm_chat',
      text: question,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...coachMessages, userMessage];
    setCoachMessages(nextMessages);
    void persistCoachHistoryEvent('llm_chat', 'user', userMessage.text);
    setCoachLoading(true);
    setCoachError(null);
    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisSnapshot: { profile, markers, result },
          coachPlan,
          messages: nextMessages,
          userQuestion: question,
        }),
      });
      if (!res.ok) throw new Error(`Coach chat failed (${res.status})`);
      const data = await res.json() as { message: CoachMessage; telemetry?: CoachProviderTelemetry };
      setCoachMessages((prev) => [...prev, data.message]);
      void persistCoachHistoryEvent('llm_chat', 'assistant', data.message.text, data.telemetry ? { telemetry: data.telemetry } : undefined);
      const telemetry = data.telemetry;
      if (telemetry) {
        setCoachTelemetry((prev) => [...prev, telemetry]);
      }
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Coach response failed');
    } finally {
      setCoachLoading(false);
    }
  };

  const handleCoachSend = async () => {
    await sendCoachQuestion(coachInput);
    setCoachInput('');
  };

  const stopCoachLiveSession = () => {
    flushLiveTurnHistory('session_end');

    liveReconnectAllowedRef.current = false;
    liveSetupCompleteRef.current = false;
    livePlaybackStartAtRef.current = 0;
    setCoachListening(false);
    setCoachLiveTranscript('Live voice off');
    if (liveSocketRef.current) {
      liveSocketRef.current.close();
      liveSocketRef.current = null;
    }
    if (liveProcessorNodeRef.current) {
      liveProcessorNodeRef.current.disconnect();
      liveProcessorNodeRef.current.onaudioprocess = null;
      liveProcessorNodeRef.current = null;
    }
    if (liveSilentSinkRef.current) {
      liveSilentSinkRef.current.disconnect();
      liveSilentSinkRef.current = null;
    }
    if (liveSourceNodeRef.current) {
      liveSourceNodeRef.current.disconnect();
      liveSourceNodeRef.current = null;
    }
    if (liveAudioContextRef.current) {
      void liveAudioContextRef.current.close();
      liveAudioContextRef.current = null;
    }
    if (liveMicStreamRef.current) {
      liveMicStreamRef.current.getTracks().forEach((track) => track.stop());
      liveMicStreamRef.current = null;
    }
  };

  const startCoachLiveSession = async () => {
    if (!coachPlan || coachLoading) return;
    if (typeof window === 'undefined' || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCoachError('Live voice requires HTTPS and microphone access support.');
      return;
    }

    setCoachError(null);
    setCoachLiveTranscript('Connecting live voice...');
    liveReconnectAllowedRef.current = true;

    const tokenRes = await fetch('/api/coach/live-token', { method: 'POST' });
    if (!tokenRes.ok) {
      throw new Error(`Could not start live session (${tokenRes.status})`);
    }
    const tokenData = await tokenRes.json() as { token: string; model: string };
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(tokenData.token)}`;
    const socket = new WebSocket(wsUrl);
    liveSocketRef.current = socket;
    liveSetupCompleteRef.current = false;
    socket.onopen = () => {
      socket.send(JSON.stringify({
        setup: {
          model: `models/${tokenData.model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      }));
    };

    socket.onmessage = async (event) => {
      let raw = '';
      if (typeof event.data === 'string') {
        raw = event.data;
      } else if (event.data instanceof Blob) {
        raw = await event.data.text();
      } else {
        return;
      }

      let payload: LiveServerMessage;
      try {
        payload = JSON.parse(raw) as LiveServerMessage;
      } catch {
        return;
      }

      if (payload.setupComplete) {
        liveSetupCompleteRef.current = true;
        setCoachLiveTranscript('Live voice connected');
        return;
      }

      if (payload.error?.message) {
        setCoachError(`Live session error: ${payload.error.message}`);
        return;
      }

      const outputTranscript = payload.serverContent?.outputTranscription?.text?.trim();
      const inputTranscript = payload.serverContent?.inputTranscription?.text?.trim();
      const shouldFlushTurn = Boolean(
        payload.turnComplete ||
        payload.interrupted ||
        payload.serverContent?.turnComplete ||
        payload.serverContent?.interrupted,
      );
      if (inputTranscript) {
        captureLiveTranscript('live_mic', inputTranscript);
      }
      if (outputTranscript) {
        setCoachLiveTranscript(outputTranscript);
        captureLiveTranscript('live_model', outputTranscript);
      }
      if (shouldFlushTurn) {
        flushLiveTurnHistory(payload.interrupted || payload.serverContent?.interrupted ? 'interrupted' : 'turn_complete');
      }

      const audioParts = payload.serverContent?.modelTurn?.parts
        ?.filter((part) => part.inlineData?.data && part.inlineData?.mimeType?.includes('audio/pcm'));
      if (audioParts && audioParts.length > 0 && liveAudioContextRef.current) {
        const ctx = liveAudioContextRef.current;
        for (const part of audioParts) {
          const pcm = base64ToPcm(part.inlineData!.data!);
          const sampleRate = sampleRateFromMimeType(part.inlineData?.mimeType);
          const floatBuffer = new Float32Array(pcm.length);
          for (let i = 0; i < pcm.length; i += 1) {
            floatBuffer[i] = pcm[i] / 0x8000;
          }
          const audioBuffer = ctx.createBuffer(1, floatBuffer.length, sampleRate);
          audioBuffer.getChannelData(0).set(floatBuffer);
          const src = ctx.createBufferSource();
          src.buffer = audioBuffer;
          src.connect(ctx.destination);
          const when = Math.max(ctx.currentTime, livePlaybackStartAtRef.current);
          src.start(when);
          livePlaybackStartAtRef.current = when + audioBuffer.duration;
        }
      }
    };

    socket.onerror = () => {
      setCoachError('Live connection failed. Please try again.');
    };

    socket.onclose = () => {
      liveSocketRef.current = null;
      liveAssistantMessageIdRef.current = null;
      liveSetupCompleteRef.current = false;
      if (liveReconnectAllowedRef.current) {
        setCoachError('Live session ended. Tap mic to reconnect.');
      }
      stopCoachLiveSession();
    };

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      liveMicStreamRef.current = micStream;
      const audioContext = new AudioContext({ sampleRate: LIVE_SAMPLE_RATE });
      liveAudioContextRef.current = audioContext;
      livePlaybackStartAtRef.current = audioContext.currentTime;

      const sourceNode = audioContext.createMediaStreamSource(micStream);
      liveSourceNodeRef.current = sourceNode;
      const processorNode = audioContext.createScriptProcessor(2048, 1, 1);
      liveProcessorNodeRef.current = processorNode;
      const silentSink = audioContext.createGain();
      silentSink.gain.value = 0;
      liveSilentSinkRef.current = silentSink;

      processorNode.onaudioprocess = (procEvent) => {
        if (!liveSetupCompleteRef.current || liveSocketRef.current?.readyState !== WebSocket.OPEN) return;
        const inputData = procEvent.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(inputData, audioContext.sampleRate);
        const pcm16 = floatTo16BitPcm(downsampled);
        const base64Audio = pcmToBase64(pcm16);
        liveSocketRef.current.send(JSON.stringify({
          realtimeInput: {
            audio: {
              data: base64Audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          },
        }));
      };

      sourceNode.connect(processorNode);
      // Keep the processor running without routing mic audio to the speakers.
      processorNode.connect(silentSink);
      silentSink.connect(audioContext.destination);
      setCoachListening(true);
    } catch (error) {
      stopCoachLiveSession();
      throw new Error(error instanceof Error ? error.message : 'Could not access microphone audio');
    }
  };

  const handleCoachMicToggle = async () => {
    if (coachListening) {
      stopCoachLiveSession();
      return;
    }
    try {
      await startCoachLiveSession();
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Could not start live session');
      setCoachListening(false);
      stopCoachLiveSession();
    }
  };

  useEffect(() => () => {
    stopCoachLiveSession();
  }, []);

  const coachState = coachPlan
    ? {
      plan: coachPlan,
      messages: coachMessages,
      telemetry: coachTelemetry,
    }
    : undefined;
  const visibleCoachMessages = coachMessages.filter((message) => message.source !== 'coach_engine');

  const markerRows = (Object.keys(MARKER_NAMES) as (keyof BloodMarkers)[])
    .filter((k) => markers[k] !== undefined)
    .map((k) => {
      const value = markers[k]!;
      const interp = getMarkerInterpretation(k, value, profile.gender);
      const unit = getMarkerUnit(k) ?? '';
      return { key: k, name: MARKER_NAMES[k], value, unit, status: interp.status, label: interp.label, score: interp.score };
    });

  const phenoAgeSnapshot = calculatePhenoAge(profile, markers);

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

  const closeCoachPanels = () => {
    if (coachClosing) return;
    setCoachClosing(true);
    window.setTimeout(() => {
      setCoachOpen(false);
      setCoachClosing(false);
    }, 260);
  };

  useEffect(() => {
    if (!exportOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current) return;
      if (exportMenuRef.current.contains(event.target as Node)) return;
      setExportOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExportOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportOpen]);

  return (
    <div
      className="min-h-screen pb-16"
      style={{ background: 'var(--page-gradient-simple)' }}
    >
      {/* Top bar */}
      <div
        className="anim-fade-up sticky top-0 z-30"
        style={{
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--header-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="w-full pl-2 sm:pl-3 pr-4 sm:pr-5 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <BrandHeaderMark href="/" sizePx={34} />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setExportOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press"
                  style={{
                    backgroundColor: 'var(--border-light)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                  title="Export report"
                >
                  <Download className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  <span>Export</span>
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                </button>
                {exportOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 min-w-[190px] rounded-xl p-1.5 z-20"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
                    }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleDownloadPDF();
                        setExportOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Download className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      Export as PDF
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleDownloadCSV();
                        setExportOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      Export as CSV
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleDownloadJSON();
                        setExportOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <FileJson className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      Export as JSON
                    </button>
                  </div>
                )}
              </div>

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

        {phenoAgeSnapshot && (
          <div className="pdf-avoid-break" style={{ marginTop: 14, border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>Biological Age (PhenoAge)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: '#666' }}>Bio age</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{phenoAgeSnapshot.phenoAge.toFixed(1)} yrs</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#666' }}>Calendar age</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{phenoAgeSnapshot.chronologicalAge} yrs</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#666' }}>Delta</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  {phenoAgeSnapshot.delta > 0 ? '+' : ''}{phenoAgeSnapshot.delta.toFixed(1)} yrs
                </div>
              </div>
            </div>
            {phenoAgeSnapshot.usedEstimates && phenoAgeSnapshot.missingMarkers.length > 0 && (
              <div style={{ fontSize: 10, color: '#666', marginTop: 6 }}>
                Population averages used for: {phenoAgeSnapshot.missingMarkers.map((k) => MARKER_NAMES[k]).join(', ')}.
              </div>
            )}
          </div>
        )}

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
      <div id="screen-content" className="max-w-5xl mx-auto px-4 sm:px-5 pt-6 sm:pt-8 xl:relative xl:-translate-x-5">
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>
                      Your Results
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {usedAverageMarkers
                        ? 'Based on your profile and estimated average markers'
                        : estimatedFromQuestionnaire
                          ? 'Based on your profile and lifestyle-estimated markers'
                          : 'Based on your profile and blood markers'}
                    </p>
                  </div>
                  <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold btn-press shrink-0"
                    style={{
                      backgroundColor: 'var(--border-light)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span>{resetLabel}</span>
                  </button>
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

                {estimatedFromQuestionnaire && !usedAverageMarkers && (
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: 'var(--status-info-bg)',
                      border: '1px solid var(--status-info-border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Estimated from your lifestyle answers
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      These markers were estimated from a short questionnaire — not a real blood panel. Use this as a directional guide, not a diagnosis.
                    </p>
                  </div>
                )}

                <BioAgeCard profile={profile} markers={markers} />

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
                  <style>{`.tab-scroll::-webkit-scrollbar { display: none; }`}</style>
                  <div
                    className="tab-scroll flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-x-visible -mx-1 px-1 sm:mx-0 sm:px-0 pb-1 sm:pb-0"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {availableTabs.map((tab) => (
                      <TabButton key={tab} tab={tab} active={displayedTab === tab} onClick={setActiveTab} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 xl:hidden anim-fade-up delay-2">
          <div
            className="rounded-2xl p-4 sm:p-5"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow, 0 6px 20px rgba(0,0,0,0.05))',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href="/coach-history"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold btn-press"
                style={{
                  backgroundColor: 'var(--border-light)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                Coach History
              </Link>
              <h3 className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                Personalized Plan
              </h3>
            </div>
            {coachPlan ? (
              <>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {coachPlan.summary}
                </p>
                <div className="mt-3 space-y-2">
                  {coachPlan.priorities.slice(0, 3).map((priority, idx) => (
                    <div
                      key={`inline-plan-${priority.title}-${idx}`}
                      className="rounded-xl p-3"
                      style={{
                        backgroundColor: 'var(--bg-warm)',
                        border: '1px solid var(--border-light)',
                        animation: 'coachPriorityPop 0.55s cubic-bezier(0.34, 1.6, 0.5, 1) both',
                        animationDelay: `${140 + idx * 140}ms`,
                        transformOrigin: 'left center',
                        willChange: 'transform, opacity',
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {idx + 1}. {priority.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {priority.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm mt-2" style={{ color: coachError ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                {coachLoading
                  ? 'Creating your personalized plan...'
                  : coachError ?? 'Your personalized plan is not ready yet.'}
              </p>
            )}
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
            <div className="mt-8 anim-fade-up delay-5">
              <DietPlanCard
                profile={profile}
                markers={markers}
                result={result}
                analysisId={savedAnalysisId ?? undefined}
                initialPlan={dietPlan}
                onPlanUpdated={setDietPlan}
              />
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

      <MarkerHoverPopup
        markerKey={activeMarker?.key ?? null}
        value={activeMarker?.value ?? null}
        rect={activeMarker?.rect ?? null}
        onDismiss={() => setActiveMarker(null)}
      />

      <button
        type="button"
        onClick={() => {
          setCoachClosing(false);
          setCoachOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold btn-press"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
          color: 'var(--text-inverse)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
        }}
      >
        <MessageCircle className="w-4 h-4" />
        Coach
      </button>

      {coachOpen && (
        <>
          <style>{`
            @keyframes coachSlideIn {
              from {
                opacity: 0;
                transform: translateX(calc(100% + 24px));
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            @keyframes coachSlideOut {
              from {
                opacity: 1;
                transform: translateX(0);
              }
              to {
                opacity: 0;
                transform: translateX(calc(100% + 24px));
              }
            }
            @keyframes coachSlideInLeft {
              from {
                opacity: 0;
                transform: translateX(calc(-100% - 24px));
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            @keyframes coachSlideOutLeft {
              from {
                opacity: 1;
                transform: translateX(0);
              }
              to {
                opacity: 0;
                transform: translateX(calc(-100% - 24px));
              }
            }
            @keyframes coachPriorityPop {
              0%   { opacity: 0; transform: scale(0.78) translateY(8px); }
              55%  { opacity: 1; transform: scale(1.06) translateY(-2px); }
              80%  { transform: scale(0.98) translateY(0.5px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes coachBackdropFade {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes coachCaretBlink {
              0%, 45%   { opacity: 1; }
              50%, 95%  { opacity: 0; }
              100%      { opacity: 1; }
            }
            .coach-typewriter-caret {
              display: inline-block;
              margin-left: 1px;
              color: var(--accent);
              font-weight: 600;
              animation: coachCaretBlink 0.9s steps(1, end) infinite;
            }
          `}</style>
          <button
            type="button"
            aria-label="Close coach panel backdrop"
            onClick={closeCoachPanels}
            className="fixed inset-0 z-40"
            style={{
              backgroundColor: 'transparent',
              animation: 'coachBackdropFade 0.3s ease both',
            }}
          />
          <aside
            className="hidden xl:block fixed left-10 top-28 w-[360px] z-50"
            style={{
              animation: coachClosing
                ? 'coachSlideOutLeft 0.26s ease both'
                : 'coachSlideInLeft 0.48s cubic-bezier(0.22, 1.12, 0.36, 1) both',
              willChange: 'transform, opacity',
            }}
          >
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.38)', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.75)' }}>
              <div className="flex items-start justify-between gap-3">
                <Link
                  href="/coach-history"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold btn-press"
                  style={{
                    backgroundColor: 'var(--border-light)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  Coach History
                </Link>
                <h3 className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                  Personalized Plan
                </h3>
              </div>
              {coachPlan ? (
                <>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                    {coachPlan.summary}
                  </p>
                  <div className="mt-3 space-y-2">
                    {coachPlan.priorities.slice(0, 3).map((priority, idx) => (
                      <div
                        key={`left-pop-plan-${priority.title}-${idx}`}
                        className="rounded-xl p-3"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.42)',
                          border: 'none',
                          boxShadow: '0 1px 6px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.65)',
                          animation: 'coachPriorityPop 0.55s cubic-bezier(0.34, 1.6, 0.5, 1) both',
                          animationDelay: `${140 + idx * 140}ms`,
                          transformOrigin: 'left center',
                          willChange: 'transform, opacity',
                        }}
                      >
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {idx + 1}. {priority.title}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {priority.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm mt-2" style={{ color: coachError ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                  {coachLoading
                    ? 'Creating your personalized plan...'
                    : coachError ?? 'Your personalized plan is not ready yet.'}
                </p>
              )}
            </div>
          </aside>
          <aside
            className="fixed right-3 sm:right-4 top-3 sm:top-4 h-[calc(100%-1.5rem)] sm:h-[calc(100%-2rem)] w-[calc(100%-1.5rem)] sm:w-[420px] md:w-[460px] z-50 p-4 sm:p-5 overflow-hidden rounded-3xl flex flex-col"
            style={{
              animation: coachClosing
                ? 'coachSlideOut 0.26s ease both'
                : 'coachSlideIn 0.48s cubic-bezier(0.22, 1.12, 0.36, 1) both',
              willChange: 'transform, opacity',
              background: 'linear-gradient(165deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.008) 100%)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(2px) saturate(1.01)',
              WebkitBackdropFilter: 'blur(2px) saturate(1.01)',
              boxShadow: [
                '0 10px 18px rgba(8, 12, 22, 0.05)',
                '0 2px 8px rgba(8, 12, 22, 0.02)',
                'inset 0 1px 0 rgba(255,255,255,0.26)',
                'inset 0 -1px 0 rgba(255,255,255,0.05)',
              ].join(', '),
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                background:
                  'radial-gradient(160% 80% at 8% -18%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.10) 38%, transparent 68%), radial-gradient(110% 70% at 100% 110%, rgba(125, 186, 133, 0.22) 0%, transparent 62%)',
                mixBlendMode: 'screen',
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 20%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.85) 80%, transparent 100%)',
              }}
            />
            <div className="relative mb-4 shrink-0">
              <Link
                href="/coach-history"
                className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold btn-press"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.45)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                History
              </Link>
              <h2 className="font-display text-xl text-center" style={{ color: 'var(--text-primary)' }}>
                Coach
              </h2>
              <button
                type="button"
                onClick={closeCoachPanels}
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.45)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                Close
              </button>
            </div>

            <div className="space-y-4 relative z-[1] flex-1 min-h-0">
              <div className="rounded-2xl p-4 h-full flex flex-col" style={{ backgroundColor: 'rgba(255,255,255,0.38)', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.75)' }}>
                {isSignedIn ? (
                  <>
                    <div className="mt-3 space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
                      {visibleCoachMessages.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          Ask a question to start the conversation.
                        </p>
                      ) : visibleCoachMessages.map((message) => {
                        const isAssistant = message.role === 'assistant';
                        const alreadyTyped =
                          !isAssistant || typedMessageIdsRef.current.has(message.id);
                        return (
                          <div
                            key={message.id}
                            className="rounded-xl px-3 py-2"
                            style={{
                              backgroundColor: isAssistant ? 'rgba(255,255,255,0.45)' : 'rgba(107, 143, 113, 0.12)',
                              border: 'none',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.65)',
                            }}
                          >
                            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                              {isAssistant ? 'Coach' : 'You'}
                            </p>
                            <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                              {isAssistant ? (
                                <TypewriterText
                                  text={message.text}
                                  alreadyTyped={alreadyTyped}
                                  onDone={() => {
                                    typedMessageIdsRef.current.add(message.id);
                                  }}
                                />
                              ) : (
                                message.text
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={coachInput}
                        onChange={(e) => setCoachInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleCoachSend();
                          }
                        }}
                        placeholder="Ask a follow-up about your plan..."
                        className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                        style={{
                          border: 'none',
                          backgroundColor: 'rgba(255,255,255,0.55)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.05)',
                          color: 'var(--text-primary)',
                        }}
                        disabled={coachLoading || !coachPlan}
                      />
                      <button
                        type="button"
                        onClick={() => void handleCoachMicToggle()}
                        disabled={!coachPlan}
                        aria-label={coachListening ? 'Stop live coach voice' : 'Start live coach voice'}
                        className="rounded-xl px-3 py-2 text-sm font-semibold btn-press disabled:opacity-50"
                        style={{
                          backgroundColor: coachListening ? 'rgba(220, 38, 38, 0.15)' : 'rgba(255,255,255,0.55)',
                          color: coachListening ? 'var(--status-danger)' : 'var(--text-primary)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        {coachListening ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCoachSend()}
                        disabled={coachLoading || !coachPlan || coachInput.trim().length === 0}
                        className="rounded-xl px-4 py-2 text-sm font-semibold btn-press disabled:opacity-50"
                        style={{
                          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                          color: 'var(--text-inverse)',
                        }}
                      >
                        {coachLoading && coachPlan ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                    {coachListening && (
                      <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                        Listening... {coachLiveTranscript ? `"${coachLiveTranscript}"` : 'speak now'}
                      </p>
                    )}
                    {coachError && (
                      <p className="text-xs mt-2" style={{ color: 'var(--status-danger)' }}>
                        {coachError}
                      </p>
                    )}
                  </>
                ) : (
                  <div
                    className="mt-3 rounded-xl p-4"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.5)',
                      border: '1px solid var(--border-light)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Sign in to chat with your Coach
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Create a free account to ask follow-up questions and get personalized coaching chat.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href="/sign-in"
                        className="rounded-xl px-3 py-2 text-xs font-semibold btn-press"
                        style={{
                          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                          color: 'var(--text-inverse)',
                        }}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="rounded-xl px-3 py-2 text-xs font-semibold btn-press"
                        style={{
                          backgroundColor: 'var(--border-light)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Sign Up
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
