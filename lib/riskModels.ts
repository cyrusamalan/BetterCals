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
 * - Uses: age, sex, total cholesterol, HDL.
 * - Assumptions (per request):
 *   - Non-smoker
 *   - No diabetes
 *   - Untreated SBP = 120
 *
 * Notes:
 * - The full published model is race-specific (White/Black) and includes SBP treatment status.
 * - Because `UserProfile` does not include race and SBP, this implements the "White" sex-specific coefficients
 *   with the above assumptions.
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

  // Assumptions requested
  const sbp = 120;
  const smoker = 0;
  const diabetes = 0;
  const treatedSbp = 0;

  const lnAge = ln(age);
  const lnTC = ln(tc);
  const lnHDL = ln(hdl);
  const lnSBP = ln(sbp);

  // Coefficients: White men / White women (ACC/AHA 2013 PCE)
  // Source commonly cited in open implementations; kept explicit for auditability.
  if (sex === 'male') {
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
    return Math.round(clamp01(risk) * 1000) / 10; // one decimal %
  }

  // female
  {
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
    return Math.round(clamp01(risk) * 1000) / 10; // one decimal %
  }
}

