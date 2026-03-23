import type { BloodMarkers, UserProfile } from '@/types';

type Sex = UserProfile['gender'];
type Race = 'white' | 'black';

export interface ASCVDResult {
  risk: number | null;
  reason?: string;
}

interface PCECoefficients {
  lnAge: number;
  lnAgeSq: number;
  lnTC: number;
  lnAge_lnTC: number;
  lnHDL: number;
  lnAge_lnHDL: number;
  lnSBP_untreated: number;
  lnSBP_treated: number;
  smoker: number;
  lnAge_smoker: number;
  diabetes: number;
  s0_10: number;
  meanX: number;
}

// ACC/AHA 2013 Pooled Cohort Equations — race×sex coefficient tables.
const COEFFICIENTS: Record<`${Race}_${Sex}`, PCECoefficients> = {
  black_male: {
    lnAge: 2.469, lnAgeSq: 0,
    lnTC: 0.302, lnAge_lnTC: 0,
    lnHDL: -0.307, lnAge_lnHDL: 0,
    lnSBP_untreated: 1.809, lnSBP_treated: 1.916,
    smoker: 0.549, lnAge_smoker: 0,
    diabetes: 0.645, s0_10: 0.8954, meanX: 19.54,
  },
  black_female: {
    lnAge: 17.114, lnAgeSq: 0,
    lnTC: 0.940, lnAge_lnTC: 0,
    lnHDL: -18.920, lnAge_lnHDL: 4.475,
    lnSBP_untreated: 27.820, lnSBP_treated: 29.291,
    smoker: 0.691, lnAge_smoker: 0,
    diabetes: 0.874, s0_10: 0.9533, meanX: 86.61,
  },
  white_male: {
    lnAge: 12.344, lnAgeSq: 0,
    lnTC: 11.853, lnAge_lnTC: -2.664,
    lnHDL: -7.990, lnAge_lnHDL: 1.769,
    lnSBP_untreated: 1.764, lnSBP_treated: 1.797,
    smoker: 7.837, lnAge_smoker: -1.795,
    diabetes: 0.658, s0_10: 0.9144, meanX: 61.18,
  },
  white_female: {
    lnAge: -29.799, lnAgeSq: 4.884,
    lnTC: 13.540, lnAge_lnTC: -3.114,
    lnHDL: -13.578, lnAge_lnHDL: 3.149,
    lnSBP_untreated: 1.957, lnSBP_treated: 2.019,
    smoker: 7.574, lnAge_smoker: -1.665,
    diabetes: 0.661, s0_10: 0.9665, meanX: -29.18,
  },
};

function ln(x: number) {
  return Math.log(x);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/** Compute the individual sum using PCE coefficients and log-transformed inputs. */
function computePCESum(
  coef: PCECoefficients,
  lnAge: number, lnTC: number, lnHDL: number, lnSBP: number,
  treatedSbp: number, smoker: number, diabetes: number,
): number {
  return (
    coef.lnAge * lnAge +
    coef.lnAgeSq * (lnAge * lnAge) +
    coef.lnTC * lnTC +
    coef.lnAge_lnTC * (lnAge * lnTC) +
    coef.lnHDL * lnHDL +
    coef.lnAge_lnHDL * (lnAge * lnHDL) +
    (treatedSbp ? coef.lnSBP_treated : coef.lnSBP_untreated) * lnSBP +
    coef.smoker * smoker +
    coef.lnAge_smoker * (lnAge * smoker) +
    coef.diabetes * diabetes
  );
}

/** Convert PCE sum to 10-year risk percentage, rounded to 1 decimal. */
function pceRisk(coef: PCECoefficients, sum: number): number {
  const risk = 1 - Math.pow(coef.s0_10, Math.exp(sum - coef.meanX));
  return Math.round(clamp01(risk) * 1000) / 10;
}

/** Validate inputs and return null with reason if ASCVD cannot be computed. */
function validateASCVDInputs(
  profile: UserProfile,
  markers: BloodMarkers,
): { reason: string } | null {
  if (profile.age < 40 || profile.age > 79) {
    return { reason: 'ASCVD risk modeling is validated only for ages 40–79.' };
  }
  if (markers.totalCholesterol === undefined || markers.hdl === undefined) {
    return { reason: 'Total Cholesterol and HDL are required to calculate ASCVD risk.' };
  }
  if (!(markers.totalCholesterol > 0) || !(markers.hdl > 0)) {
    return { reason: 'Total Cholesterol and HDL must be positive values.' };
  }
  const sbp = profile.bloodPressureSystolic;
  if (sbp === undefined || sbp === null || !(sbp > 0)) {
    return { reason: 'Systolic blood pressure is required to calculate ASCVD risk.' };
  }
  return null;
}

/**
 * ACC/AHA Pooled Cohort Equations (2013).
 *
 * Inputs:
 * - Official model is validated for ages 40–79; returns null with reason if out of bounds.
 * - Uses: age, sex, total cholesterol, HDL, systolic BP, smoker, diabetes, and BP treatment.
 * - If optional clinical fields are missing:
 *   - smoker defaults to false (conservative)
 *   - diabetic defaults to false (conservative)
 *   - treatedForHypertension defaults to false
 *   - bloodPressureSystolic: if missing, ASCVD cannot be computed → returns null
 *
 * Notes:
 * - The full published model is race-specific (White/Black) and includes SBP treatment status.
 * - Non-White/non-Black races use White coefficients (model limitation).
 *
 * Returns:
 * - { risk, reason } — risk as percentage (0–100), or null with an explanation.
 */
export function calculateASCVDRisk(profile: UserProfile, markers: BloodMarkers): ASCVDResult {
  const invalid = validateASCVDInputs(profile, markers);
  if (invalid) return { risk: null, reason: invalid.reason };

  const race: Race = profile.race === 'black' ? 'black' : 'white';
  const coef = COEFFICIENTS[`${race}_${profile.gender}`];

  const lnAge = ln(profile.age);
  const lnTC = ln(markers.totalCholesterol!);
  const lnHDL = ln(markers.hdl!);
  const lnSBP = ln(profile.bloodPressureSystolic!);
  const smoker = profile.smoker ? 1 : 0;
  const diabetes = profile.diabetic ? 1 : 0;
  const treatedSbp = profile.treatedForHypertension ? 1 : 0;

  const sum = computePCESum(coef, lnAge, lnTC, lnHDL, lnSBP, treatedSbp, smoker, diabetes);
  return { risk: pceRisk(coef, sum) };
}
