import type { BloodMarkers, UserProfile } from '@/types';
import { isPlausibleValue } from '@/lib/bloodParser';
import { estimateAverageMarkers } from '@/lib/averageMarkers';

/**
 * PhenoAge (Levine's Clock) — biological age estimate from a 9-marker panel.
 *
 * Reference: Levine ME et al., "An epigenetic biomarker of aging for lifespan
 * and healthspan," J Gerontol A Biol Sci Med Sci 73(4):532–540 (2018).
 *
 * The model fits a Gompertz proportional-hazards mortality model in NHANES,
 * then back-converts a 10-year mortality risk into a "phenotypic age" — the
 * chronological age at which the observed risk would equal the population
 * average. PhenoAge minus chronological age is the deviation from the
 * trajectory expected at the user's age.
 *
 * NOT a clinical diagnostic — interpret the *delta* and *trend over time*,
 * not single-point absolute values.
 */

// ── Levine 2018 supplementary Table 1 — linear predictor coefficients ──
const COEF = {
  intercept: -19.907,
  albumin: -0.0336,            // input: g/L
  creatinine: 0.0095,          // input: µmol/L
  glucose: 0.1953,             // input: mmol/L
  lnCRP: 0.0954,               // input: ln(mg/dL); CRP floored at 0.01 mg/dL
  lymphocytePct: -0.0120,      // input: %
  mcv: 0.0268,                 // input: fL
  rdw: 0.3306,                 // input: %
  alkalinePhosphatase: 0.00188,// input: U/L
  whiteBloodCells: 0.0554,     // input: 10^3 cells/µL
  age: 0.0804,                 // input: years
} as const;

const GOMPERTZ_GAMMA = 0.0076927;
const HORIZON_MONTHS = 120; // 10-year mortality

// PhenoAge back-conversion constants from Levine 2018.
const PHENOAGE_INTERCEPT = 141.50225;
const PHENOAGE_LN_K = 0.090165;
const PHENOAGE_BASELINE_HAZARD = 0.00553;

// Unit conversions.
const ALBUMIN_DL_TO_L = 10;            // g/dL → g/L
const CREATININE_MGDL_TO_UMOLL = 88.4017; // mg/dL → µmol/L
const GLUCOSE_MGDL_TO_MMOLL = 18.0182;    // mg/dL ÷ this → mmol/L
const CRP_MGL_TO_MGDL = 10;            // hsCRP mg/L ÷ 10 → mg/dL
const CRP_FLOOR_MGDL = 0.01;           // floor before ln() to avoid -Infinity

export type PhenoAgeMarkerKey =
  | 'albumin'
  | 'creatinine'
  | 'glucose'
  | 'hsCRP'
  | 'lymphocytePct'
  | 'mcv'
  | 'rdw'
  | 'alkalinePhosphatase'
  | 'whiteBloodCells';

export const PHENOAGE_REQUIRED_MARKERS: PhenoAgeMarkerKey[] = [
  'albumin',
  'creatinine',
  'glucose',
  'hsCRP',
  'lymphocytePct',
  'mcv',
  'rdw',
  'alkalinePhosphatase',
  'whiteBloodCells',
];

/**
 * Markers that materially track biological aging (CBC + inflammation).
 * If ANY of these are missing, we will not back-fill from population averages —
 * the model would just regress toward chronological age and the user would see
 * a meaningless "your bio-age is your age" result. Returns null instead.
 */
const CRITICAL_MARKERS: PhenoAgeMarkerKey[] = [
  'hsCRP',
  'rdw',
  'mcv',
  'lymphocytePct',
  'whiteBloodCells',
  'alkalinePhosphatase',
];

export interface PhenoAgeResult {
  /** Biological age in years (Levine PhenoAge). */
  phenoAge: number;
  /** Chronological age at time of calculation. */
  chronologicalAge: number;
  /** phenoAge - chronologicalAge. Negative = biologically younger. */
  delta: number;
  /** 10-year mortality probability from the underlying Gompertz model (0–1). */
  mortalityScore: number;
  /** True when one or more non-critical inputs were filled from population averages. */
  usedEstimates: boolean;
  /** Markers missing from user input, in the order they're filled (if any). */
  missingMarkers: PhenoAgeMarkerKey[];
}

export interface PhenoAgeOptions {
  /**
   * Allow non-critical markers (albumin, creatinine, glucose) to be filled from
   * `estimateAverageMarkers`. Critical CBC/inflammation markers are never estimated.
   * Defaults to true.
   */
  allowEstimates?: boolean;
}

function isUsableMarker(key: keyof BloodMarkers, value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && isPlausibleValue(key, value);
}

/**
 * Compute the Levine PhenoAge linear predictor (xb).
 * Inputs are in the conventional U.S. lab units used elsewhere in the app;
 * this function handles all unit conversions internally.
 */
function linearPredictor(args: {
  age: number;
  albuminGdl: number;
  creatinineMgdl: number;
  glucoseMgdl: number;
  crpMgl: number;
  lymphocytePct: number;
  mcvFl: number;
  rdwPct: number;
  alpUl: number;
  wbcKul: number;
}): number {
  const albuminGl = args.albuminGdl * ALBUMIN_DL_TO_L;
  const creatinineUmoll = args.creatinineMgdl * CREATININE_MGDL_TO_UMOLL;
  const glucoseMmoll = args.glucoseMgdl / GLUCOSE_MGDL_TO_MMOLL;
  const crpMgdl = Math.max(args.crpMgl / CRP_MGL_TO_MGDL, CRP_FLOOR_MGDL);
  const lnCrp = Math.log(crpMgdl);

  return (
    COEF.intercept +
    COEF.albumin * albuminGl +
    COEF.creatinine * creatinineUmoll +
    COEF.glucose * glucoseMmoll +
    COEF.lnCRP * lnCrp +
    COEF.lymphocytePct * args.lymphocytePct +
    COEF.mcv * args.mcvFl +
    COEF.rdw * args.rdwPct +
    COEF.alkalinePhosphatase * args.alpUl +
    COEF.whiteBloodCells * args.wbcKul +
    COEF.age * args.age
  );
}

/** 10-year all-cause mortality probability from Gompertz model. */
function mortalityFromXb(xb: number): number {
  const expXb = Math.exp(xb);
  const cumulativeHazard = (expXb * (Math.exp(GOMPERTZ_GAMMA * HORIZON_MONTHS) - 1)) / GOMPERTZ_GAMMA;
  const m = 1 - Math.exp(-cumulativeHazard);
  // Clamp to (epsilon, 1 - epsilon) so the back-conversion never sees ln(0).
  return Math.min(0.999_999, Math.max(1e-6, m));
}

/** Back-convert mortality probability into Phenotypic Age (years). */
function phenoAgeFromMortality(m: number): number {
  return (
    PHENOAGE_INTERCEPT +
    Math.log(-PHENOAGE_BASELINE_HAZARD * Math.log(1 - m)) / PHENOAGE_LN_K
  );
}

/**
 * Calculate biological age from a user's profile and blood markers.
 *
 * Returns `null` if any *critical* CBC/inflammation marker (CRP, RDW, MCV,
 * lymphocyte %, WBC, ALP) is missing — without these the score regresses
 * toward chronological age and is not informative.
 *
 * If `allowEstimates` is true (default) and a *non-critical* marker is missing
 * (albumin, creatinine, fasting glucose), it is filled from
 * `estimateAverageMarkers(profile)` and `usedEstimates` is set to true.
 */
export function calculatePhenoAge(
  profile: UserProfile,
  markers: BloodMarkers,
  options: PhenoAgeOptions = {},
): PhenoAgeResult | null {
  const allowEstimates = options.allowEstimates ?? true;

  // Reject if profile age is missing or implausible — without it the model is meaningless.
  if (!Number.isFinite(profile.age) || profile.age < 18 || profile.age > 110) {
    return null;
  }

  // Hard gate: every critical marker must be present and plausible.
  for (const key of CRITICAL_MARKERS) {
    if (!isUsableMarker(key, markers[key])) {
      return null;
    }
  }

  // Fill non-critical markers from population averages if allowed.
  const missingMarkers: PhenoAgeMarkerKey[] = [];
  const resolved: Partial<Record<PhenoAgeMarkerKey, number>> = {};
  const averages = allowEstimates ? estimateAverageMarkers(profile) : {};

  for (const key of PHENOAGE_REQUIRED_MARKERS) {
    const userValue = markers[key];
    if (isUsableMarker(key, userValue)) {
      resolved[key] = userValue;
      continue;
    }
    // Critical missing already handled above; here only non-critical can be missing.
    const fallback = averages[key];
    if (allowEstimates && isUsableMarker(key, fallback)) {
      resolved[key] = fallback;
      missingMarkers.push(key);
    } else {
      return null;
    }
  }

  const xb = linearPredictor({
    age: profile.age,
    albuminGdl: resolved.albumin!,
    creatinineMgdl: resolved.creatinine!,
    glucoseMgdl: resolved.glucose!,
    crpMgl: resolved.hsCRP!,
    lymphocytePct: resolved.lymphocytePct!,
    mcvFl: resolved.mcv!,
    rdwPct: resolved.rdw!,
    alpUl: resolved.alkalinePhosphatase!,
    wbcKul: resolved.whiteBloodCells!,
  });

  const mortalityScore = mortalityFromXb(xb);
  const phenoAge = phenoAgeFromMortality(mortalityScore);

  if (!Number.isFinite(phenoAge)) return null;

  // Clamp to a sane display range to avoid extreme outliers from data-entry quirks.
  const clamped = Math.min(120, Math.max(18, phenoAge));

  return {
    phenoAge: Math.round(clamped * 10) / 10,
    chronologicalAge: profile.age,
    delta: Math.round((clamped - profile.age) * 10) / 10,
    mortalityScore,
    usedEstimates: missingMarkers.length > 0,
    missingMarkers,
  };
}
