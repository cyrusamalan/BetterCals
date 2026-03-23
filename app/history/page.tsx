'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowLeft,
  TrendingUp,
  Activity,
  Heart,
  Scale,
  Loader2,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { AnalysisHistory, BloodMarkers } from '@/types';
import { getMarkerInterpretation } from '@/lib/bloodParser';

const MARKER_LABELS: Record<keyof BloodMarkers, string> = {
  glucose: 'Glucose (mg/dL)',
  hba1c: 'HbA1c (%)',
  totalCholesterol: 'Total Cholesterol (mg/dL)',
  nonHdl: 'Non-HDL (mg/dL)',
  ldl: 'LDL (mg/dL)',
  hdl: 'HDL (mg/dL)',
  triglycerides: 'Triglycerides (mg/dL)',
  apoB: 'ApoB (mg/dL)',
  hsCRP: 'hs-CRP (mg/L)',
  tsh: 'TSH (mIU/L)',
  vitaminD: 'Vitamin D (ng/mL)',
  vitaminB12: 'Vitamin B12 (pg/mL)',
  ferritin: 'Ferritin (ng/mL)',
  iron: 'Iron (mcg/dL)',
  alt: 'ALT (U/L)',
  ast: 'AST (U/L)',
  albumin: 'Albumin (g/dL)',
  creatinine: 'Creatinine (mg/dL)',
  uricAcid: 'Uric Acid (mg/dL)',
  fastingInsulin: 'Fasting Insulin (mIU/L)',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compareAId, setCompareAId] = useState<number | null>(null);
  const [compareBId, setCompareBId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    async function fetchAnalyses() {
      try {
        const res = await fetch('/api/analyses');
        if (!res.ok) throw new Error(`Failed to load analyses (${res.status})`);
        const data: AnalysisHistory[] = await res.json();
        setAnalyses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyses();
  }, [isSignedIn, isLoaded]);

  useEffect(() => {
    if (analyses.length >= 2 && (compareAId === null || compareBId === null)) {
      setCompareAId(analyses[1].id);
      setCompareBId(analyses[0].id);
    }
  }, [analyses, compareAId, compareBId]);

  // Chronological order for charts (oldest first)
  const chronological = useMemo(() => [...analyses].reverse(), [analyses]);

  // Health score trend data
  const healthScoreTrend = useMemo(
    () =>
      chronological.map((a) => ({
        date: formatShortDate(a.createdAt),
        overall: a.result.healthScore.overall,
        metabolic: a.result.healthScore.metabolic,
        cardiovascular: a.result.healthScore.cardiovascular,
      })),
    [chronological]
  );

  // Weight trend data
  const weightTrend = useMemo(() => {
    const points = chronological.map((a) => ({
      date: formatShortDate(a.createdAt),
      weight: a.profile.weightLbs,
    }));
    const uniqueWeights = new Set(points.map((p) => p.weight));
    return uniqueWeights.size > 1 ? points : [];
  }, [chronological]);

  // Find markers that appear across multiple analyses
  const markerTrends = useMemo(() => {
    const markerKeys = Object.keys(MARKER_LABELS) as (keyof BloodMarkers)[];
    const trends: { key: keyof BloodMarkers; label: string; data: { date: string; value: number }[] }[] = [];

    for (const key of markerKeys) {
      const points: { date: string; value: number }[] = [];
      for (const a of chronological) {
        const val = a.markers[key];
        if (val !== undefined && val !== null) {
          points.push({ date: formatShortDate(a.createdAt), value: val });
        }
      }
      if (points.length >= 2) {
        trends.push({ key, label: MARKER_LABELS[key], data: points });
      }
    }

    return trends;
  }, [chronological]);

  const compareA = useMemo(
    () => analyses.find((a) => a.id === compareAId) ?? null,
    [analyses, compareAId]
  );
  const compareB = useMemo(
    () => analyses.find((a) => a.id === compareBId) ?? null,
    [analyses, compareBId]
  );

  const comparisonRows = useMemo(() => {
    if (!compareA || !compareB) return [];
    const keys = Object.keys(MARKER_LABELS) as (keyof BloodMarkers)[];
    const rows: {
      key: keyof BloodMarkers;
      label: string;
      aVal: number;
      bVal: number;
      delta: number;
      direction: 'improved' | 'worse' | 'unchanged';
    }[] = [];

    for (const key of keys) {
      const aVal = compareA.markers[key];
      const bVal = compareB.markers[key];
      if (aVal === undefined || bVal === undefined) continue;
      const aScore = getMarkerInterpretation(key, aVal, compareA.profile.gender).score;
      const bScore = getMarkerInterpretation(key, bVal, compareB.profile.gender).score;
      const delta = Number((bVal - aVal).toFixed(1));
      let direction: 'improved' | 'worse' | 'unchanged' = 'unchanged';
      if (bScore > aScore) direction = 'improved';
      if (bScore < aScore) direction = 'worse';
      rows.push({ key, label: MARKER_LABELS[key], aVal, bVal, delta, direction });
    }

    return rows.sort((x, y) => {
      if (x.direction === y.direction) return Math.abs(y.delta) - Math.abs(x.delta);
      if (x.direction === 'worse') return -1;
      if (y.direction === 'worse') return 1;
      if (x.direction === 'improved') return -1;
      return 1;
    });
  }, [compareA, compareB]);

  // --- Render states ---

  if (!isLoaded || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-warm)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading your history...
          </p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--bg-warm)' }}
      >
        <div
          className="relative overflow-hidden rounded-2xl noise max-w-md w-full text-center p-8"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
          }}
        >
          <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Sign in required
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Please sign in to view your analysis history and track trends over time.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--bg-warm)' }}
      >
        <div
          className="relative overflow-hidden rounded-2xl noise max-w-md w-full text-center p-8"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
          }}
        >
          <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#c0392b' }} />
          <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Error loading history
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--bg-warm)' }}
      >
        <div
          className="relative overflow-hidden rounded-2xl noise max-w-md w-full text-center p-8"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
          }}
        >
          <FolderOpen className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No analyses yet
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Complete your first analysis and save it to start tracking your health trends over time.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Start an Analysis
          </Link>
        </div>
      </div>
    );
  }

  // --- Main history dashboard ---
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-warm)' }}>
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            History &amp; Trends
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Track how your health metrics change over time across {analyses.length} saved{' '}
          {analyses.length === 1 ? 'analysis' : 'analyses'}.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-12 space-y-6">
        {/* Comparison mode */}
        {analyses.length >= 2 && (
          <div
            className="relative overflow-hidden rounded-2xl noise"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Comparison Mode
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Compare two saved analyses side by side with improvement/regression markers.
              </p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Analysis A
                  <select
                    className="select-field mt-1"
                    value={compareAId ?? ''}
                    onChange={(e) => setCompareAId(Number(e.target.value))}
                  >
                    {analyses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatDate(a.createdAt)} - Score {a.result.healthScore.overall}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Analysis B
                  <select
                    className="select-field mt-1"
                    value={compareBId ?? ''}
                    onChange={(e) => setCompareBId(Number(e.target.value))}
                  >
                    {analyses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatDate(a.createdAt)} - Score {a.result.healthScore.overall}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {compareA && compareB && (
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div style={{ color: 'var(--text-tertiary)' }}>Overall score</div>
                    <div style={{ color: 'var(--text-primary)' }}>{compareA.result.healthScore.overall}</div>
                    <div style={{ color: 'var(--text-primary)' }}>{compareB.result.healthScore.overall}</div>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                {comparisonRows.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    No overlapping markers between the selected analyses.
                  </p>
                ) : (
                  comparisonRows.map((row) => {
                    const badgeColor =
                      row.direction === 'improved'
                        ? 'var(--status-normal)'
                        : row.direction === 'worse'
                          ? 'var(--status-danger)'
                          : 'var(--text-tertiary)';
                    const icon =
                      row.direction === 'improved' ? '↑' : row.direction === 'worse' ? '↓' : '→';
                    return (
                      <div
                        key={row.key}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center rounded-lg px-3 py-2"
                        style={{ border: '1px solid var(--border-light)' }}
                      >
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {row.label}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                          {row.aVal}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                          {row.bVal}
                        </span>
                        <span className="text-xs font-semibold tabular-nums" style={{ color: badgeColor }}>
                          {icon} {row.delta > 0 ? '+' : ''}
                          {row.delta}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Health Score Trend */}
        {healthScoreTrend.length >= 2 && (
          <div
            className="relative overflow-hidden rounded-2xl noise"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <div
              className="px-5 py-4 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border-light)' }}
            >
              <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Health Score Trend
              </h3>
            </div>
            <div className="px-5 py-4">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthScoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e2dc" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#948e84' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#948e84' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="overall"
                      stroke="#6b8f71"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#6b8f71' }}
                      name="Overall"
                    />
                    <Line
                      type="monotone"
                      dataKey="metabolic"
                      stroke="#d4a574"
                      strokeWidth={1.5}
                      dot={{ r: 3, fill: '#d4a574' }}
                      name="Metabolic"
                      strokeDasharray="4 2"
                    />
                    <Line
                      type="monotone"
                      dataKey="cardiovascular"
                      stroke="#c0392b"
                      strokeWidth={1.5}
                      dot={{ r: 3, fill: '#c0392b' }}
                      name="Cardiovascular"
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Weight Trend */}
        {weightTrend.length >= 2 && (
          <div
            className="relative overflow-hidden rounded-2xl noise"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <div
              className="px-5 py-4 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border-light)' }}
            >
              <Scale className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Weight Trend (lbs)
              </h3>
            </div>
            <div className="px-5 py-4">
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e2dc" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#948e84' }} />
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 11, fill: '#948e84' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#6b8f71"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#6b8f71' }}
                      name="Weight (lbs)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Blood Marker Trends */}
        {markerTrends.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Blood Marker Trends
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {markerTrends.map((trend) => (
                <div
                  key={trend.key}
                  className="relative overflow-hidden rounded-2xl noise"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    className="px-5 py-3"
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                  >
                    <h4 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {trend.label}
                    </h4>
                  </div>
                  <div className="px-3 py-3">
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trend.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e4e2dc" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#948e84' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#948e84' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#6b8f71"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#6b8f71' }}
                            name={trend.label}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Cards */}
        <div>
          <h2 className="font-display text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            All Analyses
          </h2>
          <div className="space-y-3">
            {analyses.map((analysis) => {
              const { result, profile } = analysis;
              const bmi = result.recommendations?.bmi;
              return (
                <div
                  key={analysis.id}
                  className="relative overflow-hidden rounded-2xl noise"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
                  }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                          {formatDate(analysis.createdAt)}
                        </p>
                        <p
                          className="text-sm font-semibold mt-0.5"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {profile.gender === 'male' ? 'Male' : 'Female'}, {profile.age}y,{' '}
                          {profile.weightLbs} lbs
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: scoreColor(result.healthScore.overall, 0.12),
                          color: scoreColor(result.healthScore.overall, 1),
                        }}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        {result.healthScore.overall}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MetricPill label="BMR" value={`${result.tdee.bmr} kcal`} />
                      <MetricPill label="TDEE" value={`${result.tdee.tdee} kcal`} />
                      <MetricPill label="Target" value={`${result.tdee.targetCalories} kcal`} />
                      {bmi !== undefined && bmi !== null && (
                        <MetricPill label="BMI" value={bmi.toFixed(1)} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2 text-center"
      style={{
        backgroundColor: 'var(--bg-warm)',
        border: '1px solid var(--border-light)',
      }}
    >
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

function scoreColor(score: number, alpha: number): string {
  if (score >= 80) return `rgba(107, 143, 113, ${alpha})`; // green
  if (score >= 60) return `rgba(212, 165, 116, ${alpha})`; // amber
  return `rgba(192, 57, 43, ${alpha})`; // red
}
