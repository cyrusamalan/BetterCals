import type { BloodMarkers, MarkerStatus, UserProfile } from '@/types';
import { MARKER_RULES, PLAUSIBLE_RANGES, getMarkerInterpretation } from '@/lib/bloodParser';
import { estimateAverageMarkers } from '@/lib/averageMarkers';

export interface QuestionnaireAnswers {
  dietQuality: 'poor' | 'mixed' | 'clean';
  saturatedFatIntake: 'low' | 'moderate' | 'high';
  fiberIntake: 'low' | 'moderate' | 'high';
  cardioFrequency: 'none' | 'occasional' | 'regular' | 'high';
  resistanceTraining: boolean;
  knownLipidIssue: 'none' | 'borderline' | 'diagnosed';
  knownGlucoseIssue: 'none' | 'prediabetes' | 'diabetes';
  recentWeightChange: 'losing' | 'stable' | 'gaining';
}

export interface MarkerEstimate {
  low: number;
  high: number;
  mid: number;
  tier: MarkerStatus;
  label: string;
  unit: string;
}

export type EstimatedMarkerKey =
  | 'glucose'
  | 'hba1c'
  | 'totalCholesterol'
  | 'ldl'
  | 'hdl'
  | 'triglycerides'
  | 'fastingInsulin';

export const ESTIMATED_MARKER_KEYS: EstimatedMarkerKey[] = [
  'glucose',
  'hba1c',
  'totalCholesterol',
  'ldl',
  'hdl',
  'triglycerides',
  'fastingInsulin',
];

export interface EstimationResult {
  estimates: Partial<Record<EstimatedMarkerKey, MarkerEstimate>>;
  markers: BloodMarkers;
}

const VERY_HIGH_DISPLAY_MULTIPLIER = 1.3;

function bmiFromProfile(profile: UserProfile): number {
  const heightInches = profile.heightFeet * 12 + profile.heightInches;
  const heightMeters = heightInches * 0.0254;
  const weightKg = profile.weightLbs * 0.45359237;
  if (heightMeters <= 0) return 0;
  return weightKg / (heightMeters * heightMeters);
}

function clampToPlausible(marker: keyof BloodMarkers, value: number): number {
  const range = PLAUSIBLE_RANGES[marker];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

function tierBoundsForValue(
  marker: keyof BloodMarkers,
  value: number,
  gender: UserProfile['gender'],
): { low: number; high: number; tier: MarkerStatus; label: string } {
  const interp = getMarkerInterpretation(marker, value, gender);
  const def = MARKER_RULES[marker];
  const tiers = def?.[gender] ?? def?.universal ?? [];
  const matched = tiers.find((t) => t.status === interp.status && t.label === interp.label);
  const plausible = PLAUSIBLE_RANGES[marker];

  let low = matched?.min ?? value * 0.85;
  let high = matched?.max ?? value * 1.15;

  // VERY_HIGH (999999) is a sentinel — display as a sensible cap above mid.
  if (high >= 9999) high = Math.max(value * VERY_HIGH_DISPLAY_MULTIPLIER, (matched?.min ?? value) * VERY_HIGH_DISPLAY_MULTIPLIER);
  if (plausible) {
    low = Math.max(low, plausible.min);
    high = Math.min(high, plausible.max);
  }
  if (low > high) [low, high] = [high, low];

  return { low, high, tier: interp.status, label: interp.label };
}

function roundForMarker(marker: keyof BloodMarkers, value: number): number {
  // Most markers are integers; hba1c, albumin, creatinine, hsCRP need decimals.
  if (marker === 'hba1c') return Math.round(value * 10) / 10;
  if (marker === 'fastingInsulin') return Math.round(value * 10) / 10;
  return Math.round(value);
}

interface SignalTotals {
  cardiometabolicRisk: number; // affects glucose, hba1c, fastingInsulin
  lipidRisk: number;           // affects LDL, totalCholesterol, triglycerides
  hdlBoost: number;            // affects HDL (positive = higher HDL)
  triglycerideRisk: number;    // affects triglycerides specifically
}

function computeSignals(profile: UserProfile, answers: QuestionnaireAnswers): SignalTotals {
  const bmi = bmiFromProfile(profile);
  const totals: SignalTotals = {
    cardiometabolicRisk: 0,
    lipidRisk: 0,
    hdlBoost: 0,
    triglycerideRisk: 0,
  };

  // ── Cardiometabolic (glucose / hba1c / insulin) ──
  if (bmi >= 30) totals.cardiometabolicRisk += 2;
  else if (bmi >= 27) totals.cardiometabolicRisk += 1;
  if (profile.diabetic) totals.cardiometabolicRisk += 3;
  if (answers.knownGlucoseIssue === 'prediabetes') totals.cardiometabolicRisk += 2;
  if (answers.knownGlucoseIssue === 'diabetes') totals.cardiometabolicRisk += 3;
  if (answers.cardioFrequency === 'none') totals.cardiometabolicRisk += 1;
  if (profile.stressLevel === 'high' || profile.stressLevel === 'very-high') totals.cardiometabolicRisk += 1;
  if (typeof profile.sleepHoursAvg === 'number' && profile.sleepHoursAvg < 6) totals.cardiometabolicRisk += 1;
  if (answers.dietQuality === 'poor') totals.cardiometabolicRisk += 1;
  if (typeof profile.waistInches === 'number') {
    const threshold = profile.gender === 'male' ? 40 : 35;
    if (profile.waistInches >= threshold) totals.cardiometabolicRisk += 1;
  }

  // ── Lipid (LDL / totalCholesterol) ──
  if (answers.saturatedFatIntake === 'high') totals.lipidRisk += 2;
  else if (answers.saturatedFatIntake === 'low') totals.lipidRisk -= 1;
  if (answers.dietQuality === 'poor') totals.lipidRisk += 1;
  if (answers.dietQuality === 'clean') totals.lipidRisk -= 1;
  if (profile.familyHeartDisease) totals.lipidRisk += 1;
  if (answers.knownLipidIssue === 'borderline') totals.lipidRisk += 2;
  if (answers.knownLipidIssue === 'diagnosed') totals.lipidRisk += 3;
  if (profile.smoker) totals.lipidRisk += 1;
  if (answers.fiberIntake === 'low') totals.lipidRisk += 1;
  if (answers.fiberIntake === 'high') totals.lipidRisk -= 1;

  // ── HDL (raised by good lifestyle) ──
  if (answers.resistanceTraining) totals.hdlBoost += 1;
  if (answers.cardioFrequency === 'regular') totals.hdlBoost += 1;
  if (answers.cardioFrequency === 'high') totals.hdlBoost += 2;
  if (
    typeof profile.alcoholDrinksPerWeek === 'number' &&
    profile.alcoholDrinksPerWeek > 0 &&
    profile.alcoholDrinksPerWeek <= 7
  ) totals.hdlBoost += 0.5;
  if (profile.smoker) totals.hdlBoost -= 2;
  if (answers.cardioFrequency === 'none') totals.hdlBoost -= 1;
  if (bmi >= 30) totals.hdlBoost -= 1;

  // ── Triglycerides ──
  if (answers.dietQuality === 'poor') totals.triglycerideRisk += 1;
  if (typeof profile.alcoholDrinksPerWeek === 'number' && profile.alcoholDrinksPerWeek > 7) totals.triglycerideRisk += 2;
  if (bmi >= 30) totals.triglycerideRisk += 1;
  if (answers.recentWeightChange === 'gaining') totals.triglycerideRisk += 1;
  if (profile.dietaryPattern === 'keto' || profile.dietaryPattern === 'low-carb') totals.triglycerideRisk -= 1;

  return totals;
}

/**
 * Estimate biomarker ranges from lifestyle questionnaire answers + profile.
 *
 * Strategy: start from population medians (gender × age band), apply additive
 * nudges per marker based on lifestyle signals, snap to a tier from MARKER_RULES,
 * and return both the midpoint value and the predicted tier's [min, max] range.
 *
 * Estimates are rule-based and transparent — not a clinical prediction.
 */
export function estimateMarkersFromLifestyle(
  profile: UserProfile,
  answers: QuestionnaireAnswers,
): EstimationResult {
  const baseline = estimateAverageMarkers(profile);
  const signals = computeSignals(profile, answers);

  const adjusted: Partial<Record<EstimatedMarkerKey, number>> = {};

  // Glucose: ~3 mg/dL per cardiometabolic point
  if (typeof baseline.glucose === 'number') {
    adjusted.glucose = baseline.glucose + signals.cardiometabolicRisk * 3;
  }
  // HbA1c: ~0.1% per cardiometabolic point
  if (typeof baseline.hba1c === 'number') {
    adjusted.hba1c = baseline.hba1c + signals.cardiometabolicRisk * 0.1;
  }
  // Fasting insulin: ~1.5 mIU/L per cardiometabolic point
  if (typeof baseline.fastingInsulin === 'number') {
    adjusted.fastingInsulin = baseline.fastingInsulin + signals.cardiometabolicRisk * 1.5;
  }
  // LDL: ~10 mg/dL per lipid point
  if (typeof baseline.ldl === 'number') {
    adjusted.ldl = baseline.ldl + signals.lipidRisk * 10;
  }
  // Total cholesterol: ~12 mg/dL per lipid point
  if (typeof baseline.totalCholesterol === 'number') {
    adjusted.totalCholesterol = baseline.totalCholesterol + signals.lipidRisk * 12;
  }
  // HDL: ~3 mg/dL per hdlBoost point (signed)
  if (typeof baseline.hdl === 'number') {
    adjusted.hdl = baseline.hdl + signals.hdlBoost * 3;
  }
  // Triglycerides: ~15 mg/dL per triglycerideRisk point + 8 per cardiometabolic point
  if (typeof baseline.triglycerides === 'number') {
    adjusted.triglycerides =
      baseline.triglycerides + signals.triglycerideRisk * 15 + signals.cardiometabolicRisk * 8;
  }

  const estimates: Partial<Record<EstimatedMarkerKey, MarkerEstimate>> = {};
  const markers: BloodMarkers = {};

  for (const key of ESTIMATED_MARKER_KEYS) {
    const raw = adjusted[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const clamped = clampToPlausible(key, raw);
    const rounded = roundForMarker(key, clamped);
    const bounds = tierBoundsForValue(key, rounded, profile.gender);
    const unit = MARKER_RULES[key]?.unit ?? '';
    estimates[key] = {
      low: roundForMarker(key, bounds.low),
      high: roundForMarker(key, bounds.high),
      mid: rounded,
      tier: bounds.tier,
      label: bounds.label,
      unit,
    };
    markers[key] = rounded;
  }

  return { estimates, markers };
}
