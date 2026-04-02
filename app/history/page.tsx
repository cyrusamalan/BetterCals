'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  AlertCircle,
  ArrowLeft,
  FolderOpen,
  Loader2,
  Sparkles,
  TrendingUp,
  Activity,
  Scale,
  ChevronRight,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ThemeToggle from '@/components/ThemeToggle';
import {
  AnalysisHistory,
  BloodMarkers,
  MarkerForecast,
} from '@/types';
import { deriveMarkerForecasts } from '@/lib/derivedInsights';
import { getMarkerInterpretation, getMarkerUnit } from '@/lib/bloodParser';
import MarkerEducationDrawer from '@/components/dashboard/MarkerEducationDrawer';

const MARKER_LABELS: Record<keyof BloodMarkers, string> = {
  glucose: 'Glucose',
  hba1c: 'HbA1c',
  totalCholesterol: 'Total Cholesterol',
  nonHdl: 'Non-HDL',
  ldl: 'LDL',
  hdl: 'HDL',
  triglycerides: 'Triglycerides',
  apoB: 'ApoB',
  hsCRP: 'hs-CRP',
  tsh: 'TSH',
  vitaminD: 'Vitamin D',
  vitaminB12: 'Vitamin B12',
  ferritin: 'Ferritin',
  iron: 'Iron',
  alt: 'ALT',
  ast: 'AST',
  albumin: 'Albumin',
  creatinine: 'Creatinine',
  uricAcid: 'Uric Acid',
  fastingInsulin: 'Fasting Insulin',
};

type ComparisonDirection = 'improved' | 'worse' | 'unchanged';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scoreColor(score: number, alpha: number): string {
  if (score >= 80) return `rgba(107, 143, 113, ${alpha})`;
  if (score >= 60) return `rgba(212, 165, 116, ${alpha})`;
  return `rgba(192, 57, 43, ${alpha})`;
}

function directionColor(direction: ComparisonDirection): string {
  if (direction === 'improved') return 'var(--status-normal)';
  if (direction === 'worse') return 'var(--status-danger)';
  return 'var(--text-tertiary)';
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2 text-center"
      style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
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

export default function HistoryPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compareAId, setCompareAId] = useState<number | null>(null);
  const [compareBId, setCompareBId] = useState<number | null>(null);
  const [activeMarker, setActiveMarker] = useState<{ key: keyof BloodMarkers; value: number } | null>(null);

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
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (analyses.length >= 2 && (compareAId === null || compareBId === null)) {
      setCompareAId(analyses[1].id);
      setCompareBId(analyses[0].id);
    }
  }, [analyses, compareAId, compareBId]);

  const chronological = useMemo(() => [...analyses].reverse(), [analyses]);
  const markerForecasts = useMemo(() => deriveMarkerForecasts(analyses), [analyses]);
  const forecastByMarker = useMemo(
    () => Object.fromEntries(markerForecasts.map((forecast) => [forecast.marker, forecast])),
    [markerForecasts]
  );

  const healthScoreTrend = useMemo(
    () =>
      chronological.map((analysis) => ({
        date: formatShortDate(analysis.createdAt),
        overall: analysis.result.healthScore.overall,
        metabolic: analysis.result.healthScore.metabolic,
        cardiovascular: analysis.result.healthScore.cardiovascular,
      })),
    [chronological]
  );

  const weightTrend = useMemo(() => {
    const points = chronological.map((analysis) => ({
      date: formatShortDate(analysis.createdAt),
      weight: analysis.profile.weightLbs,
    }));
    return new Set(points.map((point) => point.weight)).size > 1 ? points : [];
  }, [chronological]);

  const markerTrends = useMemo(() => {
    const keys = Object.keys(MARKER_LABELS) as (keyof BloodMarkers)[];
    return keys
      .map((key) => {
        const historyData = chronological
          .map((analysis) => ({
            date: formatShortDate(analysis.createdAt),
            value: analysis.markers[key],
          }))
          .filter((point): point is { date: string; value: number } => typeof point.value === 'number');

        if (historyData.length < 2) return null;

        const forecast = forecastByMarker[key];
        const chartData: Array<{ date: string; value?: number; projected?: number }> = [...historyData];
        if (forecast) {
          chartData.push({
            date: formatShortDate(forecast.projectedDate),
            value: historyData[historyData.length - 1].value,
            projected: historyData[historyData.length - 1].value,
          });
          chartData.push({
            date: formatShortDate(forecast.projectedDate),
            value: undefined,
            projected: forecast.projectedValue,
          });
        }

        return {
          key,
          label: MARKER_LABELS[key],
          unit: getMarkerUnit(key) ?? '',
          data: chartData,
          latestValue: historyData[historyData.length - 1].value,
          forecast,
        };
      })
      .filter((trend): trend is NonNullable<typeof trend> => trend !== null)
      .sort((a, b) => {
        const aWeight = a.forecast ? Math.abs(a.forecast.slopePer30Days) : 0;
        const bWeight = b.forecast ? Math.abs(b.forecast.slopePer30Days) : 0;
        return bWeight - aWeight;
      });
  }, [chronological, forecastByMarker]);

  const compareA = useMemo(
    () => analyses.find((analysis) => analysis.id === compareAId) ?? null,
    [analyses, compareAId]
  );
  const compareB = useMemo(
    () => analyses.find((analysis) => analysis.id === compareBId) ?? null,
    [analyses, compareBId]
  );

  const comparisonRows = useMemo(() => {
    if (!compareA || !compareB) return [];

    const keys = Object.keys(MARKER_LABELS) as (keyof BloodMarkers)[];
    return keys
      .map((key) => {
        const aVal = compareA.markers[key];
        const bVal = compareB.markers[key];
        if (typeof aVal !== 'number' || typeof bVal !== 'number') return null;
        const aScore = getMarkerInterpretation(key, aVal, compareA.profile.gender).score;
        const bScore = getMarkerInterpretation(key, bVal, compareB.profile.gender).score;
        const direction: ComparisonDirection =
          bScore > aScore ? 'improved' : bScore < aScore ? 'worse' : 'unchanged';
        return {
          key,
          label: MARKER_LABELS[key],
          aVal,
          bVal,
          delta: Number((bVal - aVal).toFixed(1)),
          direction,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((left, right) => {
        const priority = { worse: 0, improved: 1, unchanged: 2 };
        return priority[left.direction] - priority[right.direction] || Math.abs(right.delta) - Math.abs(left.delta);
      });
  }, [compareA, compareB]);

  const comparisonSummary = useMemo(() => {
    const improved = comparisonRows.filter((row) => row.direction === 'improved');
    const worsened = comparisonRows.filter((row) => row.direction === 'worse');
    const unchanged = comparisonRows.filter((row) => row.direction === 'unchanged');
    return { improved, worsened, unchanged };
  }, [comparisonRows]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-warm)' }}>
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
      <EmptyState
        icon={<AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />}
        title="Sign in required"
        description="Please sign in to view your analysis history and track trends over time."
        ctaLabel="Back to Home"
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--status-danger)' }} />}
        title="Error loading history"
        description={error}
        ctaLabel="Back to Home"
      />
    );
  }

  if (analyses.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />}
        title="No analyses yet"
        description="Complete your first analysis and save it to start tracking your health trends over time."
        ctaLabel="Start an Analysis"
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-warm)' }}>
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors hover:opacity-80"
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
              Track progress across {analyses.length} saved {analyses.length === 1 ? 'analysis' : 'analyses'} with forecasts and side-by-side comparisons.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12 space-y-6">
        {analyses.length >= 2 && compareA && compareB && (
          <section
            className="relative overflow-hidden rounded-2xl noise"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Before / After Comparison
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Compare two saved analyses and see what improved, worsened, or stayed flat.
                </p>
              </div>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Earlier analysis
                  <select
                    className="select-field mt-1"
                    value={compareAId ?? ''}
                    onChange={(e) => setCompareAId(Number(e.target.value))}
                  >
                    {analyses.map((analysis) => (
                      <option key={analysis.id} value={analysis.id}>
                        {formatDate(analysis.createdAt)} · score {analysis.result.healthScore.overall}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Later analysis
                  <select
                    className="select-field mt-1"
                    value={compareBId ?? ''}
                    onChange={(e) => setCompareBId(Number(e.target.value))}
                  >
                    {analyses.map((analysis) => (
                      <option key={analysis.id} value={analysis.id}>
                        {formatDate(analysis.createdAt)} · score {analysis.result.healthScore.overall}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <SummaryCard
                  title="Improved"
                  value={comparisonSummary.improved.length.toString()}
                  subtitle="markers moved in a better direction"
                  color="var(--status-normal)"
                />
                <SummaryCard
                  title="Worsened"
                  value={comparisonSummary.worsened.length.toString()}
                  subtitle="markers need more attention"
                  color="var(--status-danger)"
                />
                <SummaryCard
                  title="Overall score delta"
                  value={`${compareB.result.healthScore.overall - compareA.result.healthScore.overall >= 0 ? '+' : ''}${compareB.result.healthScore.overall - compareA.result.healthScore.overall}`}
                  subtitle={`${formatShortDate(compareA.createdAt)} to ${formatShortDate(compareB.createdAt)}`}
                  color="var(--accent)"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ComparisonColumn
                  title="Biggest improvements"
                  rows={comparisonSummary.improved.slice(0, 5)}
                  emptyLabel="No measurable improvements yet."
                  onOpenMarker={(key, value) => setActiveMarker({ key, value })}
                />
                <ComparisonColumn
                  title="Needs attention"
                  rows={comparisonSummary.worsened.slice(0, 5)}
                  emptyLabel="No regressions in overlapping markers."
                  onOpenMarker={(key, value) => setActiveMarker({ key, value })}
                />
                <ComparisonColumn
                  title="Stable markers"
                  rows={comparisonSummary.unchanged.slice(0, 5)}
                  emptyLabel="No unchanged overlaps."
                  onOpenMarker={(key, value) => setActiveMarker({ key, value })}
                />
              </div>
            </div>
          </section>
        )}

        {healthScoreTrend.length >= 2 && (
          <TrendCard title="Health Score Trend" icon={<Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />}>
            <ChartShell height={260}>
              <LineChart data={healthScoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} stroke="var(--text-tertiary)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'currentColor' }} stroke="var(--text-tertiary)" />
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend />
                <Line type="monotone" dataKey="overall" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} name="Overall" />
                <Line type="monotone" dataKey="metabolic" stroke="var(--accent-warm)" strokeWidth={1.8} dot={{ r: 3 }} name="Metabolic" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="cardiovascular" stroke="var(--status-danger)" strokeWidth={1.8} dot={{ r: 3 }} name="Cardiovascular" strokeDasharray="4 2" />
              </LineChart>
            </ChartShell>
          </TrendCard>
        )}

        {weightTrend.length >= 2 && (
          <TrendCard title="Weight Trend" icon={<Scale className="w-4 h-4" style={{ color: 'var(--accent)' }} />}>
            <ChartShell height={220}>
              <LineChart data={weightTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} stroke="var(--text-tertiary)" />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 11, fill: 'currentColor' }} stroke="var(--text-tertiary)" />
                <Tooltip contentStyle={tooltipStyle()} />
                <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} name="Weight (lbs)" />
              </LineChart>
            </ChartShell>
          </TrendCard>
        )}

        {markerTrends.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Marker Trends & Forecasts
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Forecasts appear only for markers with at least 3 historical data points.
                </p>
              </div>
              <ThemeToggle />
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
                  <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setActiveMarker({ key: trend.key, value: trend.latestValue })}
                        aria-label={`Open ${trend.label} details`}
                      >
                        <h3 className="text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                          {trend.label}
                        </h3>
                      </button>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        Latest: {trend.latestValue}{trend.unit ? ` ${trend.unit}` : ''}
                      </p>
                    </div>
                    {trend.forecast ? (
                      <div
                        className="rounded-lg px-2.5 py-1.5 text-right"
                        style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--border-light)' }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                          90-Day Forecast
                        </p>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {trend.forecast.projectedValue}{trend.unit ? ` ${trend.unit}` : ''}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          by {formatShortDate(trend.forecast.projectedDate)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] max-w-[10rem] text-right" style={{ color: 'var(--text-tertiary)' }}>
                        Add one more saved result to unlock forecasting.
                      </p>
                    )}
                  </div>

                  <div className="px-3 py-3">
                    <ChartShell height={190}>
                      <LineChart data={trend.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'currentColor' }} stroke="var(--text-tertiary)" />
                        <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} stroke="var(--text-tertiary)" />
                        <Tooltip contentStyle={tooltipStyle()} />
                        <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.2} dot={{ r: 3 }} connectNulls={false} name="History" />
                        {trend.forecast && (
                          <Line
                            type="monotone"
                            dataKey="projected"
                            stroke="var(--accent-warm)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            strokeDasharray="5 4"
                            connectNulls
                            name="Projected"
                          />
                        )}
                      </LineChart>
                    </ChartShell>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            All Analyses
          </h2>
          <div className="space-y-3">
            {analyses.map((analysis) => {
              const { result, profile } = analysis;
              const bmi = result.recommendations?.bmi;
              return (
                <Link
                  key={analysis.id}
                  href={`/history/${analysis.id}`}
                  className="block relative overflow-hidden rounded-2xl noise transition-all hover:scale-[1.01]"
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
                        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {profile.gender === 'male' ? 'Male' : 'Female'}, {profile.age}y, {profile.weightLbs} lbs
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MetricPill label="BMR" value={`${result.tdee.bmr} kcal`} />
                      <MetricPill label="TDEE" value={`${result.tdee.tdee} kcal`} />
                      <MetricPill label="Target" value={`${result.tdee.targetCalories} kcal`} />
                      {bmi !== undefined && bmi !== null ? (
                        <MetricPill label="BMI" value={bmi.toFixed(1)} />
                      ) : (
                        <MetricPill label="Markers" value={Object.keys(analysis.markers).length.toString()} />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
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

function ComparisonColumn({
  title,
  rows,
  emptyLabel,
  onOpenMarker,
}: {
  title: string;
  rows: Array<{
    key: keyof BloodMarkers;
    label: string;
    aVal: number;
    bVal: number;
    delta: number;
    direction: ComparisonDirection;
  }>;
  emptyLabel: string;
  onOpenMarker?: (key: keyof BloodMarkers, value: number) => void;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
        {title}
      </h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {emptyLabel}
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-3">
              <div>
                {onOpenMarker ? (
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => onOpenMarker(row.key, row.bVal)}
                    aria-label={`Open ${row.label} details`}
                  >
                    <p className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                      {row.label}
                    </p>
                  </button>
                ) : (
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {row.label}
                  </p>
                )}
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {row.aVal} → {row.bVal}
                </p>
              </div>
              <span className="text-xs font-semibold tabular-nums" style={{ color: directionColor(row.direction) }}>
                {row.delta > 0 ? '+' : ''}
                {row.delta}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
        {title}
      </p>
      <p className="font-display text-3xl mt-2" style={{ color }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
        {subtitle}
      </p>
    </div>
  );
}

function TrendCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl noise"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
        {icon}
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function ChartShell({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

function tooltipStyle() {
  return {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--text-primary)',
  };
}

function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-warm)' }}>
      <div
        className="relative overflow-hidden rounded-2xl noise max-w-md w-full text-center p-8"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
        }}
      >
        {icon}
        <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <ArrowLeft className="w-4 h-4" />
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
