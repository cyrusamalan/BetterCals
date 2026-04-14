import type { BloodMarkers, UserProfile } from '@/types';

type Sex = UserProfile['gender'];

export interface CVDRiskResult {
  /** 10-year risk percentage (0-100), or null if the model cannot be computed. */
  risk: number | null;
  reason?: string;
}

/**
 * Framingham General Cardiovascular Disease (CVD) Risk Profile (D'Agostino et al.,
 * Circulation 2008;117:743-753, "General Cardiovascular Risk Profile for Use in
 * Primary Care"). Predicts 10-year risk of total CVD (CHD, stroke, peripheral
 * artery disease, and heart failure) in patients free of CVD at baseline.
 *
 * Race-free by design. Replaces the ACC/AHA 2013 Pooled Cohort Equations, which
 * required race-specific coefficient tables (White/Black only) and fell back to
 * White coefficients for everyone else — a known limitation that systematically
 * over- or under-estimates risk for South Asian, East Asian, Hispanic, and other
 * populations.
 *
 * Model form (Cox proportional hazards):
 *   risk = 1 - S0(10) ^ exp(Σ βᵢ·Xᵢ - μ)
 *
 * Validated for ages 30-74. Outside that range we return null.
 */
interface FraminghamCoefficients {
  lnAge: number;
  lnTC: number;
  lnHDL: number;
  lnSBP_untreated: number;
  lnSBP_treated: number;
  smoker: number;
  diabetes: number;
  /** Baseline 10-year survival. */
  s0_10: number;
  /** Mean of the linear predictor (sum of βᵢ·X̄ᵢ) in the derivation cohort. */
  meanSum: number;
}

const COEFFICIENTS: Record<Sex, FraminghamCoefficients> = {
  // D'Agostino 2008, Table 2 — Women
  female: {
    lnAge: 2.32888,
    lnTC: 1.20904,
    lnHDL: -0.70833,
    lnSBP_untreated: 2.76157,
    lnSBP_treated: 2.82263,
    smoker: 0.52873,
    diabetes: 0.69154,
    s0_10: 0.95012,
    meanSum: 26.1931,
  },
  // D'Agostino 2008, Table 2 — Men
  male: {
    lnAge: 3.06117,
    lnTC: 1.12370,
    lnHDL: -0.93263,
    lnSBP_untreated: 1.93303,
    lnSBP_treated: 1.99881,
    smoker: 0.65451,
    diabetes: 0.57367,
    s0_10: 0.88936,
    meanSum: 23.9802,
  },
};

function ln(x: number): number {
  return Math.log(x);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Validate inputs and return a null-with-reason result if risk cannot be computed. */
function validateInputs(
  profile: UserProfile,
  markers: BloodMarkers,
): { reason: string } | null {
  if (profile.age < 30 || profile.age > 74) {
    return { reason: 'Cardiovascular risk modeling is validated only for ages 30–74.' };
  }
  if (markers.totalCholesterol === undefined || markers.hdl === undefined) {
    return { reason: 'Total Cholesterol and HDL are required to calculate cardiovascular risk.' };
  }
  if (!(markers.totalCholesterol > 0) || !(markers.hdl > 0)) {
    return { reason: 'Total Cholesterol and HDL must be positive values.' };
  }
  const sbp = profile.bloodPressureSystolic;
  if (sbp === undefined || sbp === null || !(sbp > 0)) {
    return { reason: 'Systolic blood pressure is required to calculate cardiovascular risk.' };
  }
  return null;
}

/**
 * Compute 10-year total CVD risk using the Framingham 2008 General CVD equation.
 *
 * Inputs used:
 * - age, sex
 * - total cholesterol, HDL (mg/dL)
 * - systolic blood pressure (mmHg) + whether user is treated for hypertension
 * - current smoker, diabetes status
 *
 * Missing optional flags default to false (conservative). SBP and the two lipid
 * values are required; if any is missing the function returns null with a reason.
 */
export function calculateCVDRisk(profile: UserProfile, markers: BloodMarkers): CVDRiskResult {
  const invalid = validateInputs(profile, markers);
  if (invalid) return { risk: null, reason: invalid.reason };

  const coef = COEFFICIENTS[profile.gender];
  const treated = profile.treatedForHypertension === true;

  const sum =
    coef.lnAge * ln(profile.age) +
    coef.lnTC * ln(markers.totalCholesterol!) +
    coef.lnHDL * ln(markers.hdl!) +
    (treated ? coef.lnSBP_treated : coef.lnSBP_untreated) * ln(profile.bloodPressureSystolic!) +
    coef.smoker * (profile.smoker ? 1 : 0) +
    coef.diabetes * (profile.diabetic ? 1 : 0);

  const risk = 1 - Math.pow(coef.s0_10, Math.exp(sum - coef.meanSum));
  return { risk: Math.round(clamp01(risk) * 1000) / 10 };
}

// ── Backwards-compat re-exports ────────────────────────────────────────────
// Older call sites and saved history use ASCVD-named fields. The underlying
// model is now Framingham general CVD (total CVD), not ACC/AHA ASCVD, but the
// result shape is identical so we preserve the old names for continuity.
export type ASCVDResult = CVDRiskResult;
export const calculateASCVDRisk = calculateCVDRisk;
