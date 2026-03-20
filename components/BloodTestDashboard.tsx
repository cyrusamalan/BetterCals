'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { AnalysisResult, BloodMarkers, Insight, UserProfile } from '@/types';
import { getMarkerDisplayRange, getMarkerInterpretation, getMarkerUnit } from '@/lib/bloodParser';
import BetterCalsMark from '@/components/BetterCalsMark';
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
} from 'lucide-react';
import { Show, SignInButton } from '@clerk/nextjs';
import CalorieTiersCard from '@/components/dashboard/CalorieTiersCard';
import RecommendationsPanel from '@/components/dashboard/RecommendationsPanel';
import ASCVDRiskCard from '@/components/dashboard/ASCVDRiskCard';

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
  nonHdl: 'Non-HDL Cholesterol',
  ldl: 'LDL Cholesterol',
  hdl: 'HDL Cholesterol',
  triglycerides: 'Triglycerides',
  apoB: 'Apolipoprotein B (ApoB)',
  hsCRP: 'hs-CRP',
  tsh: 'TSH',
  vitaminD: 'Vitamin D',
  vitaminB12: 'Vitamin B12',
  ferritin: 'Ferritin',
  iron: 'Serum Iron',
  alt: 'ALT (Liver)',
  ast: 'AST (Liver)',
  albumin: 'Albumin',
  creatinine: 'Creatinine',
  uricAcid: 'Uric Acid',
  fastingInsulin: 'Fasting Insulin',
};

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

function getRangePercent(key: keyof BloodMarkers, value: number, gender?: UserProfile['gender']): number {
  const range = getMarkerDisplayRange(key, gender);
  if (!range) return 50;

  const visualMin = Math.max(0, range.min * 0.5);
  const visualMax = range.max * 1.5;
  const pct = ((value - visualMin) / (visualMax - visualMin)) * 100;
  return Math.max(2, Math.min(98, pct));
}

function getRangeNormalZone(key: keyof BloodMarkers, gender?: UserProfile['gender']): { left: number; width: number } {
  const range = getMarkerDisplayRange(key, gender);
  if (!range) return { left: 20, width: 60 };

  const visualMin = Math.max(0, range.min * 0.5);
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

function RangeBar({
  markerKey,
  value,
  delay,
  gender,
}: {
  markerKey: keyof BloodMarkers;
  value: number;
  delay: number;
  gender?: UserProfile['gender'];
}) {
  const interp = getMarkerInterpretation(markerKey, value, gender);
  const style = getStatusStyle(interp.status);
  const needlePos = getRangePercent(markerKey, value, gender);
  const normalZone = getRangeNormalZone(markerKey, gender);
  const range = getMarkerDisplayRange(markerKey, gender);

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
            {interp.label}
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
          {range ? `${range.maxLabel} ${range.unit}` : ''}
        </span>
      </div>
    </div>
  );
}

function CategoryCard({
  category, markers, score, delayBase, gender,
}: {
  category: (typeof CATEGORIES)[number];
  markers: BloodMarkers;
  score: number;
  delayBase: number;
  gender?: UserProfile['gender'];
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
          <RangeBar
            key={key}
            markerKey={key}
            value={markers[key]!}
            delay={delayBase + i * 100}
            gender={gender}
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
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleSaveToHistory = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, markers, result }),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        console.error('Save failed:', await res.text());
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
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
        <div className="max-w-5xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-sm font-medium group btn-press"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" style={{ color: 'var(--text-tertiary)' }} />
              New Analysis
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold btn-press"
                style={{
                  backgroundColor: 'var(--border-light)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <Download className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                Download Report
              </button>

              <Show when="signed-in">
                <button
                  onClick={handleSaveToHistory}
                  disabled={saving || saved}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold btn-press disabled:opacity-50"
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
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save to History'}
                </button>
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold btn-press"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--text-inverse)',
                      border: '1px solid var(--accent)',
                    }}
                  >
                    <Save className="w-4 h-4" />
                    Sign in to Save
                  </button>
                </SignInButton>
              </Show>

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
              Race: <b>{profile.race ?? 'white'}</b><br />
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

        <div className="pdf-avoid-break" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="pdf-avoid-break" style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>ASCVD 10-Year Risk</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{ascvdDisplay}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
              ACC/AHA Pooled Cohort Equations estimate (when eligible).
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
      <div id="screen-content" className="max-w-5xl mx-auto px-5 pt-8">
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

        {/* 4. Charts row — radar, ASCVD, and full-width marker comparison */}
        {hasMarkers && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 anim-fade-up delay-4">
            {/* Top Left: Radar */}
            <div className="md:col-span-1 h-full">
              <HealthRadarChart healthScore={healthScore} />
            </div>
            
            {/* Top Right: ASCVD Risk */}
            <div className="md:col-span-1 h-full">
              <ASCVDRiskCard
                ascvdRiskScore={result.ascvdRiskScore}
                age={profile.age}
                hasLipids={markers.totalCholesterol !== undefined && markers.hdl !== undefined}
              />
            </div>
            
            {/* Bottom: Full Width Comparison Chart */}
            <div className="md:col-span-2">
              <MarkerComparisonChart markers={markers} gender={profile.gender} />
            </div>
          </div>
        )}

        {/* 5. Category cards with range bars */}
        {hasMarkers && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            {CATEGORIES.map((cat, i) => (
              <div key={cat.key} className={`anim-fade-up delay-${i + 5}`}>
                <CategoryCard
                  category={cat}
                  markers={markers}
                  score={healthScore[cat.scoreKey]}
                  delayBase={400 + i * 150}
                  gender={profile.gender}
                />
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
