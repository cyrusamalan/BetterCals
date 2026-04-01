import type { BloodMarkers, UserProfile } from '@/types';

type AgeBand = 'u30' | '30_44' | '45_59' | '60p';
function getAgeBand(age: number): AgeBand {
  if (age < 30) return 'u30';
  if (age < 45) return '30_44';
  if (age < 60) return '45_59';
  return '60p';
}

export const POPULATION_MEDIANS: Record<UserProfile['gender'], Record<AgeBand, BloodMarkers>> = {
  male: {
    u30: {
      glucose: 90,
      hba1c: 5.2,
      totalCholesterol: 175,
      ldl: 105,
      hdl: 50,
      triglycerides: 105,
      tsh: 1.9,
      vitaminD: 28,
      vitaminB12: 460,
      ferritin: 100,
      iron: 100,
      alt: 25,
      ast: 22,
      albumin: 4.5,
      creatinine: 1,
      uricAcid: 5.5,
      fastingInsulin: 5,
    },
    '30_44': {
      glucose: 92,
      hba1c: 5.3,
      totalCholesterol: 185,
      ldl: 115,
      hdl: 48,
      triglycerides: 120,
      tsh: 2,
      vitaminD: 27,
      vitaminB12: 440,
      ferritin: 110,
      iron: 95,
      alt: 28,
      ast: 24,
      albumin: 4.4,
      creatinine: 1,
      uricAcid: 5.8,
      fastingInsulin: 6,
    },
    '45_59': {
      glucose: 95,
      hba1c: 5.4,
      totalCholesterol: 195,
      ldl: 125,
      hdl: 46,
      triglycerides: 135,
      tsh: 2.2,
      vitaminD: 26,
      vitaminB12: 420,
      ferritin: 120,
      iron: 90,
      alt: 30,
      ast: 26,
      albumin: 4.3,
      creatinine: 1.05,
      uricAcid: 6,
      fastingInsulin: 7,
    },
    '60p': {
      glucose: 98,
      hba1c: 5.5,
      totalCholesterol: 200,
      ldl: 130,
      hdl: 45,
      triglycerides: 140,
      tsh: 2.4,
      vitaminD: 25,
      vitaminB12: 410,
      ferritin: 130,
      iron: 85,
      alt: 28,
      ast: 27,
      albumin: 4.1,
      creatinine: 1.1,
      uricAcid: 6.2,
      fastingInsulin: 8,
    },
  },
  female: {
    u30: {
      glucose: 88,
      hba1c: 5.1,
      totalCholesterol: 170,
      ldl: 100,
      hdl: 58,
      triglycerides: 95,
      tsh: 2.2,
      vitaminD: 27,
      vitaminB12: 500,
      ferritin: 45,
      iron: 85,
      alt: 18,
      ast: 17,
      albumin: 4.4,
      creatinine: 0.8,
      uricAcid: 4,
      fastingInsulin: 5,
    },
    '30_44': {
      glucose: 90,
      hba1c: 5.2,
      totalCholesterol: 180,
      ldl: 110,
      hdl: 56,
      triglycerides: 110,
      tsh: 2.4,
      vitaminD: 26,
      vitaminB12: 470,
      ferritin: 40,
      iron: 80,
      alt: 20,
      ast: 19,
      albumin: 4.3,
      creatinine: 0.85,
      uricAcid: 4.3,
      fastingInsulin: 6,
    },
    '45_59': {
      glucose: 93,
      hba1c: 5.3,
      totalCholesterol: 195,
      ldl: 120,
      hdl: 54,
      triglycerides: 125,
      tsh: 2.6,
      vitaminD: 25,
      vitaminB12: 450,
      ferritin: 55,
      iron: 75,
      alt: 22,
      ast: 21,
      albumin: 4.2,
      creatinine: 0.9,
      uricAcid: 4.8,
      fastingInsulin: 7,
    },
    '60p': {
      glucose: 96,
      hba1c: 5.4,
      totalCholesterol: 205,
      ldl: 125,
      hdl: 53,
      triglycerides: 130,
      tsh: 2.8,
      vitaminD: 24,
      vitaminB12: 440,
      ferritin: 70,
      iron: 70,
      alt: 23,
      ast: 22,
      albumin: 4,
      creatinine: 0.95,
      uricAcid: 5,
      fastingInsulin: 8,
    },
  },
};

export type PopulationComparisonDirection = 'higherIsBetter' | 'lowerIsBetter' | 'ambiguous';

const POPULATION_DIRECTION: Partial<Record<keyof BloodMarkers, PopulationComparisonDirection>> = {
  hdl: 'higherIsBetter',
  vitaminD: 'higherIsBetter',
  vitaminB12: 'higherIsBetter',

  glucose: 'lowerIsBetter',
  hba1c: 'lowerIsBetter',
  totalCholesterol: 'lowerIsBetter',
  nonHdl: 'lowerIsBetter',
  ldl: 'lowerIsBetter',
  triglycerides: 'lowerIsBetter',
  apoB: 'lowerIsBetter',
  hsCRP: 'lowerIsBetter',
  alt: 'lowerIsBetter',
  ast: 'lowerIsBetter',
  creatinine: 'lowerIsBetter',
  uricAcid: 'lowerIsBetter',
  fastingInsulin: 'lowerIsBetter',

  // These can be meaningfully "too low" or "too high" depending on context.
  ferritin: 'ambiguous',
  iron: 'ambiguous',
  tsh: 'ambiguous',
  albumin: 'ambiguous',
};

// Rough, marker-specific spread on a log scale. Higher = wider distribution.
// These are heuristics for UX (not clinical statistics).
const LOG_SIGMA: Partial<Record<keyof BloodMarkers, number>> = {
  glucose: 0.08,
  hba1c: 0.06,
  hdl: 0.18,
  ldl: 0.22,
  triglycerides: 0.35,
  totalCholesterol: 0.18,
  vitaminD: 0.35,
  hsCRP: 0.7,
  fastingInsulin: 0.5,
};

function normalCdf(z: number): number {
  // Abramowitz & Stegun approximation (fast + sufficient for UI).
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export function getPopulationMedian(profile: Pick<UserProfile, 'age' | 'gender'>): BloodMarkers {
  const ageBand = getAgeBand(profile.age);
  return { ...(POPULATION_MEDIANS[profile.gender]?.[ageBand] ?? {}) };
}

export function getPopulationMedianForMarker(
  profile: Pick<UserProfile, 'age' | 'gender'>,
  marker: keyof BloodMarkers,
): number | undefined {
  const table = getPopulationMedian(profile);
  return table[marker];
}

export function estimatePopulationHealthPercentile(params: {
  profile: Pick<UserProfile, 'age' | 'gender'>;
  marker: keyof BloodMarkers;
  value: number;
}): number | null {
  const { profile, marker, value } = params;
  if (!Number.isFinite(value) || value <= 0) return null;

  const median = getPopulationMedianForMarker(profile, marker);
  if (!Number.isFinite(median) || !median || median <= 0) return null;

  const direction = POPULATION_DIRECTION[marker] ?? 'ambiguous';
  if (direction === 'ambiguous') return null;

  const sigma = LOG_SIGMA[marker] ?? 0.25;
  const z = Math.log(value / median) / sigma;
  const valuePct = normalCdf(z) * 100; // % of population below this value

  const healthPct = direction === 'higherIsBetter' ? valuePct : 100 - valuePct;
  const clamped = Math.min(99, Math.max(1, healthPct)); // avoid awkward 0/100 UX
  return Math.round(clamped);
}

export function estimateAverageMarkers(profile: UserProfile): BloodMarkers {
  const ageBand = getAgeBand(profile.age);
  const fromTable = POPULATION_MEDIANS[profile.gender]?.[ageBand];
  if (fromTable) return { ...fromTable };

  // Safe fallback (kept conservative and non-extreme)
  const fallback: BloodMarkers = {
    glucose: 92,
    hba1c: 5.3,
    totalCholesterol: 185,
    ldl: 115,
    hdl: profile.gender === 'male' ? 48 : 56,
    triglycerides: 120,
    tsh: profile.gender === 'female' ? 2.4 : 2,
    vitaminD: 26,
    vitaminB12: 450,
    ferritin: profile.gender === 'female' ? 45 : 110,
    iron: profile.gender === 'female' ? 80 : 95,
    alt: profile.gender === 'male' ? 26 : 20,
    ast: profile.gender === 'male' ? 24 : 19,
    albumin: 4.3,
    creatinine: profile.gender === 'male' ? 1 : 0.85,
    uricAcid: profile.gender === 'male' ? 5.8 : 4.3,
    fastingInsulin: 6,
  };

  return { ...fallback };
}

