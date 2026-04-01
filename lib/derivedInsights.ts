import {
  ActionPlanItem,
  AnalysisHistory,
  BloodMarkers,
  Insight,
  MarkerForecast,
  PopulationBenchmark,
  UserProfile,
} from '@/types';
import { POPULATION_MEDIANS } from '@/lib/averageMarkers';
import { getMarkerInterpretation } from '@/lib/bloodParser';

type AgeBand = 'u30' | '30_44' | '45_59' | '60p';

const ACTION_PLAN_FALLBACKS: Record<string, Omit<ActionPlanItem, 'id' | 'priority'>> = {
  glucose: {
    title: 'Improve glucose control',
    rationale: 'Tightening fasting glucose and HbA1c usually has the biggest metabolic payoff.',
    relatedMarkers: ['glucose', 'hba1c', 'fastingInsulin'],
  },
  hba1c: {
    title: 'Lower average blood sugar',
    rationale: 'Your recent markers suggest insulin sensitivity deserves immediate focus.',
    relatedMarkers: ['hba1c', 'glucose', 'fastingInsulin'],
  },
  ldl: {
    title: 'Prioritize lipid improvement',
    rationale: 'Lowering atherogenic lipids can materially improve long-term cardiovascular risk.',
    relatedMarkers: ['ldl', 'nonHdl', 'apoB', 'triglycerides'],
  },
  hdl: {
    title: 'Support cardiometabolic recovery',
    rationale: 'This marker profile points to a need for more movement and better fat quality.',
    relatedMarkers: ['hdl', 'triglycerides', 'hsCRP'],
  },
  triglycerides: {
    title: 'Reduce triglyceride pressure',
    rationale: 'Triglycerides often respond quickly to better carb quality, alcohol control, and walking.',
    relatedMarkers: ['triglycerides', 'hdl', 'fastingInsulin'],
  },
  vitaminD: {
    title: 'Correct vitamin D deficiency',
    rationale: 'Vitamin D is one of the cleanest deficiencies to address over the next month.',
    relatedMarkers: ['vitaminD'],
  },
  vitaminB12: {
    title: 'Rebuild B12 status',
    rationale: 'Low B12 can affect energy, recovery, and long-term nutritional resilience.',
    relatedMarkers: ['vitaminB12'],
  },
  ferritin: {
    title: 'Restore iron stores',
    rationale: 'Low ferritin is actionable and can meaningfully improve fatigue and training tolerance.',
    relatedMarkers: ['ferritin', 'iron'],
  },
  iron: {
    title: 'Improve iron intake and absorption',
    rationale: 'Low iron deserves focused nutrition and supplement follow-through.',
    relatedMarkers: ['iron', 'ferritin'],
  },
  hsCRP: {
    title: 'Lower inflammatory load',
    rationale: 'Reducing systemic inflammation can improve both recovery and cardiovascular risk.',
    relatedMarkers: ['hsCRP', 'alt', 'triglycerides'],
  },
  tsh: {
    title: 'Follow up on thyroid pattern',
    rationale: 'Your thyroid marker stands out enough to justify consistent follow-up and clinician review.',
    relatedMarkers: ['tsh'],
  },
};

function getAgeBand(age: number): AgeBand {
  if (age < 30) return 'u30';
  if (age < 45) return '30_44';
  if (age < 60) return '45_59';
  return '60p';
}

function roundTo(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getMarkerKeys(markers: BloodMarkers): (keyof BloodMarkers)[] {
  return Object.keys(markers) as (keyof BloodMarkers)[];
}

export function deriveActionPlan(
  profile: UserProfile,
  markers: BloodMarkers,
  insights: Insight[],
  deficiencies: string[],
  risks: string[]
): ActionPlanItem[] {
  const rankedMarkers = getMarkerKeys(markers)
    .map((marker) => {
      const value = markers[marker];
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      const interpretation = getMarkerInterpretation(marker, value, profile.gender);
      return { marker, interpretation, value };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.interpretation.score - b.interpretation.score);

  const items: ActionPlanItem[] = [];
  const seen = new Set<string>();

  for (const item of rankedMarkers) {
    const template = ACTION_PLAN_FALLBACKS[item.marker];
    if (!template || seen.has(template.title)) continue;
    items.push({
      id: `${item.marker}-priority-${items.length + 1}`,
      priority: (items.length + 1) as 1 | 2 | 3,
      ...template,
    });
    seen.add(template.title);
    if (items.length === 3) return items;
  }

  for (const deficiency of deficiencies) {
    const title = `Address ${deficiency.toLowerCase()}`;
    if (seen.has(title)) continue;
    items.push({
      id: `deficiency-${items.length + 1}`,
      title,
      rationale: 'This deficiency is explicitly flagged in the current analysis and should be part of this month’s plan.',
      priority: (items.length + 1) as 1 | 2 | 3,
      relatedMarkers: [],
    });
    seen.add(title);
    if (items.length === 3) return items;
  }

  for (const insight of insights) {
    const title = insight.title;
    if (!insight.recommendation || seen.has(title)) continue;
    items.push({
      id: `insight-${items.length + 1}`,
      title,
      rationale: insight.recommendation,
      priority: (items.length + 1) as 1 | 2 | 3,
      relatedMarkers: [],
    });
    seen.add(title);
    if (items.length === 3) return items;
  }

  for (const risk of risks) {
    const title = `Reduce ${risk.toLowerCase()}`;
    if (seen.has(title)) continue;
    items.push({
      id: `risk-${items.length + 1}`,
      title,
      rationale: 'This risk is already surfaced by the calculator and should be included in the immediate action plan.',
      priority: (items.length + 1) as 1 | 2 | 3,
      relatedMarkers: [],
    });
    seen.add(title);
    if (items.length === 3) return items;
  }

  while (items.length < 3) {
    const fallbackTitle = items.length === 0
      ? 'Stay consistent with calorie targets'
      : items.length === 1
        ? 'Keep meal timing structured'
        : 'Retest after a full month of consistency';
    items.push({
      id: `fallback-${items.length + 1}`,
      title: fallbackTitle,
      rationale: 'No stronger marker-specific priority is available, so keep the plan centered on repeatable adherence.',
      priority: (items.length + 1) as 1 | 2 | 3,
      relatedMarkers: [],
    });
  }

  return items;
}

export function derivePopulationBenchmarks(
  profile: UserProfile,
  markers: BloodMarkers
): PopulationBenchmark[] {
  const ageBand = getAgeBand(profile.age);
  const medians = POPULATION_MEDIANS[profile.gender]?.[ageBand];
  if (!medians) return [];

  return getMarkerKeys(markers)
    .map((marker) => {
      const userValue = markers[marker];
      const benchmarkValue = medians[marker];
      if (typeof userValue !== 'number' || typeof benchmarkValue !== 'number') return null;
      return {
        marker,
        userValue,
        benchmarkValue,
        delta: roundTo(userValue - benchmarkValue, 1),
      };
    })
    .filter((item): item is PopulationBenchmark => item !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function deriveMarkerForecasts(
  analyses: AnalysisHistory[],
  horizonDays = 90
): MarkerForecast[] {
  if (analyses.length < 3) return [];

  const chronological = [...analyses]
    .filter((analysis) => Number.isFinite(new Date(analysis.createdAt).getTime()))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (chronological.length < 3) return [];

  const allMarkers = new Set<keyof BloodMarkers>();
  for (const analysis of chronological) {
    for (const marker of getMarkerKeys(analysis.markers)) {
      allMarkers.add(marker);
    }
  }

  const forecasts: MarkerForecast[] = [];
  for (const marker of allMarkers) {
    const points = chronological
      .map((analysis) => ({
        time: new Date(analysis.createdAt).getTime(),
        value: analysis.markers[marker],
      }))
      .filter((point): point is { time: number; value: number } => typeof point.value === 'number' && Number.isFinite(point.value));

    if (points.length < 3) continue;

    const first = points[0].time;
    const xs = points.map((point) => (point.time - first) / 86_400_000);
    const ys = points.map((point) => point.value);
    const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
    const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < xs.length; i += 1) {
      numerator += (xs[i] - xMean) * (ys[i] - yMean);
      denominator += (xs[i] - xMean) ** 2;
    }

    if (denominator <= 0) continue;
    const slopePerDay = numerator / denominator;
    const spanDays = xs[xs.length - 1] - xs[0];
    if (spanDays < 14) continue;

    const latest = points[points.length - 1];
    const projectedValue = latest.value + slopePerDay * horizonDays;
    const projectedDate = new Date(latest.time + horizonDays * 86_400_000).toISOString();
    const magnitude = Math.abs(slopePerDay * 30);

    if (!Number.isFinite(projectedValue) || magnitude < 0.05) continue;

    forecasts.push({
      marker,
      points: points.length,
      slopePer30Days: roundTo(slopePerDay * 30, 2),
      projectedValue: roundTo(clamp(projectedValue, -9999, 9999), 1),
      projectedDate,
    });
  }

  return forecasts.sort((a, b) => Math.abs(b.slopePer30Days) - Math.abs(a.slopePer30Days));
}
