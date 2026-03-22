import type { BloodMarkers, UserProfile } from '@/types';

type Sex = UserProfile['gender'];

function ln(x: number) {
  return Math.log(x);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * ACC/AHA Pooled Cohort Equations (2013) — simplified implementation.
 *
 * Inputs:
 * - Official model is validated for ages 40–79; we return null if out of bounds.
 * - Uses: age, sex, total cholesterol, HDL, systolic BP, smoker, diabetes, and BP treatment.
 * - If optional clinical fields are missing:
 *   - smoker defaults to false (conservative)
 *   - diabetic defaults to false (conservative)
 *   - treatedForHypertension defaults to false
 *   - bloodPressureSystolic: if missing, ASCVD cannot be computed → returns null
 *
 * Notes:
 * - The full published model is race-specific (White/Black) and includes SBP treatment status.
 * - Because `UserProfile` does not include race, this implements the "White" sex-specific coefficients.
 *
 * Returns:
 * - Risk as a percentage (0–100), e.g. 7.5 means 7.5% 10-year risk.
 */
export function calculateASCVDRisk(profile: UserProfile, markers: BloodMarkers): number | null {
  const age = profile.age;
  if (age < 40 || age > 79) return null;

  const tc = markers.totalCholesterol;
  const hdl = markers.hdl;
  if (tc === undefined || hdl === undefined) return null;
  if (!(tc > 0) || !(hdl > 0)) return null;

  const sex: Sex = profile.gender;
  // Default to white coefficients when race is not specified
  const race = profile.race === 'black' ? 'black' : 'white';

  // Blood pressure is required for ASCVD — do not assume a default
  const sbp = profile.bloodPressureSystolic;
  if (sbp === undefined || sbp === null || !(sbp > 0)) return null;
  const smoker = profile.smoker ? 1 : 0;
  const diabetes = profile.diabetic ? 1 : 0;
  const treatedSbp = profile.treatedForHypertension ? 1 : 0;

  const lnAge = ln(age);
  const lnTC = ln(tc);
  const lnHDL = ln(hdl);
  const lnSBP = ln(sbp);

  // Coefficients: ACC/AHA 2013 Pooled Cohort Equations.
  // Race rule (per request): use Black coefficients only when profile.race === 'black';
  // otherwise default to White coefficients.
  if (race === 'black' && sex === 'male') {
    const coef = {
      lnAge: 2.469,
      lnAgeSq: 0,
      lnTC: 0.302,
      lnAge_lnTC: 0,
      lnHDL: -0.307,
      lnAge_lnHDL: 0,
      lnSBP_untreated: 1.809,
      lnSBP_treated: 1.916,
      smoker: 0.549,
      lnAge_smoker: 0,
      diabetes: 0.645,
      s0_10: 0.8954,
      meanX: 19.54,
    } as const;

    const sum =
      coef.lnAge * lnAge +
      coef.lnTC * lnTC +
      coef.lnHDL * lnHDL +
      (treatedSbp ? coef.lnSBP_treated : coef.lnSBP_untreated) * lnSBP +
      coef.smoker * smoker +
      coef.diabetes * diabetes;

    const risk = 1 - Math.pow(coef.s0_10, Math.exp(sum - coef.meanX));
    return Math.round(clamp01(risk) * 1000) / 10;
  }

  if (race === 'black' && sex === 'female') {
    const coef = {
      lnAge: 17.114,
      lnAgeSq: 0,
      lnTC: 0.940,
      lnAge_lnTC: 0,
      lnHDL: -18.920,
      lnAge_lnHDL: 4.475,
      lnSBP_untreated: 27.820,
      lnSBP_treated: 29.291,
      smoker: 0.691,
      lnAge_smoker: 0,
      diabetes: 0.874,
      s0_10: 0.9533,
      meanX: 86.61,
    } as const;

    const sum =
      coef.lnAge * lnAge +
      coef.lnTC * lnTC +
      coef.lnHDL * lnHDL +
      coef.lnAge_lnHDL * (lnAge * lnHDL) +
      (treatedSbp ? coef.lnSBP_treated : coef.lnSBP_untreated) * lnSBP +
      coef.smoker * smoker +
      coef.diabetes * diabetes;

    const risk = 1 - Math.pow(coef.s0_10, Math.exp(sum - coef.meanX));
    return Math.round(clamp01(risk) * 1000) / 10;
  }

  if (sex === 'male') {
    // White men
    const coef = {
      lnAge: 12.344,
      lnAgeSq: 0,
      lnTC: 11.853,
      lnAge_lnTC: -2.664,
      lnHDL: -7.990,
      lnAge_lnHDL: 1.769,
      lnSBP_untreated: 1.764,
      lnSBP_treated: 1.797,
      smoker: 7.837,
      lnAge_smoker: -1.795,
      diabetes: 0.658,
      s0_10: 0.9144,
      meanX: 61.18,
    } as const;

    const sum =
      coef.lnAge * lnAge +
      coef.lnTC * lnTC +
      coef.lnAge_lnTC * (lnAge * lnTC) +
      coef.lnHDL * lnHDL +
      coef.lnAge_lnHDL * (lnAge * lnHDL) +
      (treatedSbp ? coef.lnSBP_treated : coef.lnSBP_untreated) * lnSBP +
      coef.smoker * smoker +
      coef.lnAge_smoker * (lnAge * smoker) +
      coef.diabetes * diabetes;

    const risk = 1 - Math.pow(coef.s0_10, Math.exp(sum - coef.meanX));
    return Math.round(clamp01(risk) * 1000) / 10;
  }

  // White women
  const coef = {
    lnAge: -29.799,
    lnAgeSq: 4.884,
    lnTC: 13.540,
    lnAge_lnTC: -3.114,
    lnHDL: -13.578,
    lnAge_lnHDL: 3.149,
    lnSBP_untreated: 1.957,
    lnSBP_treated: 2.019,
    smoker: 7.574,
    lnAge_smoker: -1.665,
    diabetes: 0.661,
    s0_10: 0.9665,
    meanX: -29.18,
  } as const;

  const sum =
    coef.lnAge * lnAge +
    coef.lnAgeSq * (lnAge * lnAge) +
    coef.lnTC * lnTC +
    coef.lnAge_lnTC * (lnAge * lnTC) +
    coef.lnHDL * lnHDL +
    coef.lnAge_lnHDL * (lnAge * lnHDL) +
    (treatedSbp ? coef.lnSBP_treated : coef.lnSBP_untreated) * lnSBP +
    coef.smoker * smoker +
    coef.lnAge_smoker * (lnAge * smoker) +
    coef.diabetes * diabetes;

  const risk = 1 - Math.pow(coef.s0_10, Math.exp(sum - coef.meanX));
  return Math.round(clamp01(risk) * 1000) / 10;
}

