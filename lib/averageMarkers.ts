import type { BloodMarkers, UserProfile } from '@/types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lbsToKg(lbs: number) {
  return lbs * 0.453592;
}

function feetInchesToMeters(feet: number, inches: number) {
  const totalInches = feet * 12 + inches;
  const cm = totalInches * 2.54;
  return cm / 100;
}

function calcBmi(profile: UserProfile) {
  const kg = lbsToKg(profile.weightLbs);
  const m = feetInchesToMeters(profile.heightFeet, profile.heightInches);
  return kg / (m * m);
}

type AgeBand = 'u30' | '30_44' | '45_59' | '60p';
function getAgeBand(age: number): AgeBand {
  if (age < 30) return 'u30';
  if (age < 45) return '30_44';
  if (age < 60) return '45_59';
  return '60p';
}

/**
 * Heuristic “population-typical” markers adjusted by sex, age band, and BMI.
 * This is intentionally conservative: small shifts, clamped to plausible ranges.
 */
export function estimateAverageMarkers(profile: UserProfile): BloodMarkers {
  const ageBand = getAgeBand(profile.age);
  const bmi = calcBmi(profile);

  // Baseline (rough “typical adult” placeholders)
  let glucose = 92;
  let hba1c = 5.3;
  let totalCholesterol = 185;
  let ldl = 110;
  let hdl = profile.gender === 'male' ? 48 : 58;
  let triglycerides = 120;
  let tsh = profile.gender === 'female' ? 2.5 : 2.1;
  let vitaminD = 30;
  let vitaminB12 = 450;
  let ferritin = profile.gender === 'female' ? 45 : 90;
  let iron = profile.gender === 'female' ? 80 : 95;

  // Age adjustments (small, monotonic trends)
  const ageAdj =
    ageBand === 'u30' ? 0 :
    ageBand === '30_44' ? 1 :
    ageBand === '45_59' ? 3 : 5;

  glucose += ageAdj * 0.8;
  hba1c += ageAdj * 0.03;
  totalCholesterol += ageAdj * 2.0;
  ldl += ageAdj * 1.6;
  triglycerides += ageAdj * 2.0;
  // HDL often decreases slightly with age; keep very small
  hdl -= ageAdj * 0.4;
  // TSH drifts upward with age in many populations
  tsh += ageAdj * 0.05;

  // BMI adjustments (use deviations from ~24 as a mild signal)
  const bmiDelta = bmi - 24;
  glucose += bmiDelta * 0.9;
  hba1c += bmiDelta * 0.015;
  triglycerides += bmiDelta * 3.5;
  ldl += bmiDelta * 1.6;
  hdl -= bmiDelta * 0.9;
  vitaminD -= bmiDelta * 0.8;

  // Clamp to plausible “typical” bounds (not clinical diagnosis thresholds)
  glucose = Math.round(clamp(glucose, 75, 115));
  hba1c = Math.round(clamp(hba1c, 4.8, 6.0) * 10) / 10;
  totalCholesterol = Math.round(clamp(totalCholesterol, 150, 230));
  ldl = Math.round(clamp(ldl, 70, 160));
  hdl = Math.round(clamp(hdl, 35, 80));
  triglycerides = Math.round(clamp(triglycerides, 70, 220));
  tsh = Math.round(clamp(tsh, 0.8, 4.2) * 10) / 10;
  vitaminD = Math.round(clamp(vitaminD, 18, 45));
  vitaminB12 = Math.round(clamp(vitaminB12, 320, 700));
  ferritin = Math.round(clamp(ferritin, profile.gender === 'female' ? 15 : 30, 160));
  iron = Math.round(clamp(iron, 55, 120));

  return {
    glucose,
    hba1c,
    totalCholesterol,
    ldl,
    hdl,
    triglycerides,
    tsh,
    vitaminD,
    vitaminB12,
    ferritin,
    iron,
  };
}

