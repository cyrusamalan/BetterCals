import { UserProfile, ActivityLevel, TDEEResult, BloodMarkers, HealthScore, Insight, CalorieTier, MacroBreakdown, PersonalizedRecs, MealTimingSuggestion } from '@/types';
import { getMarkerInterpretation } from '@/lib/bloodParser';
import { calculateASCVDRisk, type ASCVDResult } from '@/lib/riskModels';

/** Human-readable names for blood markers — shared across insight generation and risk identification. */
const MARKER_NAMES: Record<keyof BloodMarkers, string> = {
  glucose: 'Glucose',
  hba1c: 'HbA1c',
  totalCholesterol: 'Total Cholesterol',
  nonHdl: 'Non-HDL Cholesterol',
  ldl: 'LDL Cholesterol',
  hdl: 'HDL Cholesterol',
  triglycerides: 'Triglycerides',
  apoB: 'Apolipoprotein B (ApoB)',
  hsCRP: 'hs-CRP',
  tsh: 'TSH',
  vitaminD: 'Vitamin D',
  vitaminB12: 'Vitamin B12',
  ferritin: 'Ferritin',
  iron: 'Serum Iron',
  alt: 'ALT (Liver)',
  ast: 'AST (Liver)',
  albumin: 'Albumin',
  creatinine: 'Creatinine',
  uricAcid: 'Uric Acid',
  fastingInsulin: 'Fasting Insulin',
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  'sedentary': 1.2,
  'light': 1.375,
  'moderate': 1.55,
  'active': 1.725,
  'very-active': 1.9,
};

// Conversion utilities
function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
}

export function calculateTDEE(profile: UserProfile): TDEEResult {
  // Clamp inputs to valid ranges to prevent garbage results
  const weight = Math.max(40, Math.min(700, profile.weightLbs));
  const age = Math.max(13, Math.min(120, profile.age));
  
  // Convert imperial to metric for calculation
  const weightKg = lbsToKg(weight);
  const heightCm = feetInchesToCm(profile.heightFeet, profile.heightInches);

  // Mifflin-St Jeor Equation
  let bmr: number;

  if (profile.gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const tdee = Math.round(bmr * activityMultiplier);

  // Adjust for goal
  // Deficit/surplus ratios per common sports nutrition guidelines (ISSN, NASM):
  // - Weight loss: 20% deficit is moderate and preserves lean mass (Helms et al., 2014)
  // - Weight gain: 10% surplus minimizes fat gain during a lean bulk (Iraki et al., 2019)
  let targetCalories = tdee;
  if (profile.goal === 'lose') {
    targetCalories = Math.round(tdee * 0.8);
  } else if (profile.goal === 'gain') {
    targetCalories = Math.round(tdee * 1.1);
  }

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    activityMultiplier,
  };
}

export function calculateHealthScore(markers: BloodMarkers, profile?: Pick<UserProfile, 'gender'>): HealthScore {
  const gender = profile?.gender;

  const scoreCategory = (keys: (keyof BloodMarkers)[]): { score: number; hasData: boolean } => {
    const values = keys
      .map((k) => {
        const v = markers[k];
        if (v === undefined) return null;
        return getMarkerInterpretation(k, v, gender).score;
      })
      .filter((v): v is number => v !== null);

    if (values.length === 0) return { score: 0, hasData: false };
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return { score: Math.round(avg), hasData: true };
  };

  const metabolic = scoreCategory(['glucose', 'hba1c', 'fastingInsulin']);
  const cardiovascular = scoreCategory(['totalCholesterol', 'ldl', 'hdl', 'triglycerides', 'nonHdl', 'apoB', 'hsCRP']);
  const hormonal = scoreCategory(['tsh']);
  const nutritional = scoreCategory(['vitaminD', 'vitaminB12', 'ferritin', 'iron']);
  const hepatic = scoreCategory(['alt', 'ast', 'albumin']);
  const renal = scoreCategory(['creatinine', 'uricAcid']);

  const validCategoryScores = [metabolic, cardiovascular, hormonal, nutritional, hepatic, renal]
    .filter((c) => c.hasData)
    .map((c) => c.score);

  const overall =
    validCategoryScores.length === 0
      ? 0
      : Math.round(validCategoryScores.reduce((sum, v) => sum + v, 0) / validCategoryScores.length);

  return {
    overall,
    metabolic: metabolic.score,
    cardiovascular: cardiovascular.score,
    hormonal: hormonal.score,
    nutritional: nutritional.score,
    hepatic: hepatic.score,
    renal: renal.score,
  };
}

export function generateInsights(profile: UserProfile, tdee: TDEEResult, markers: BloodMarkers): Insight[] {
  const insights: Insight[] = [];

  // TDEE-based insights
  insights.push({
    type: 'info',
    title: 'Your Maintenance Calories',
    description: `Based on your profile (${profile.weightLbs} lbs, ${profile.heightFeet}'${profile.heightInches}"), you burn approximately ${tdee.tdee} calories per day.`,
    recommendation: profile.goal === 'lose' 
      ? `To lose weight sustainably, aim for ${tdee.targetCalories} calories daily.` 
      : profile.goal === 'gain'
      ? `To gain lean mass, aim for ${tdee.targetCalories} calories daily.`
      : `Maintain your current intake of ${tdee.targetCalories} calories.`,
  });

  const typeFromStatus = (status: ReturnType<typeof getMarkerInterpretation>['status']): Insight['type'] => {
    if (status === 'critical' || status === 'high') return 'danger';
    if (status === 'borderline' || status === 'low') return 'warning';
    if (status === 'unknown') return 'info';
    // normal / optimal
    return 'success';
  };

  const getDescription = (marker: keyof BloodMarkers, value: number, label: string): string => {
    const name = MARKER_NAMES[marker] ?? marker;
    return `${name}: ${value} (${label}).`;
  };

  // Blood marker insights (strictly rule-driven)
  for (const marker of Object.keys(markers) as (keyof BloodMarkers)[]) {
    const value = markers[marker];
    if (value === undefined) continue;

    const interp = getMarkerInterpretation(marker, value, profile.gender);
    const type = typeFromStatus(interp.status);

    insights.push({
      type,
      title: `${MARKER_NAMES[marker]} — ${interp.label}`,
      description: getDescription(marker, value, interp.label),
    });
  }

  return insights;
}

export function identifyDeficiencies(markers: BloodMarkers, profile: Pick<UserProfile, 'gender'>): string[] {
  const deficiencies: string[] = [];

  const DEFICIENCY_LABELS: Partial<Record<keyof BloodMarkers, string>> = {
    vitaminD: 'Vitamin D',
    vitaminB12: 'Vitamin B12',
    ferritin: 'Iron (Ferritin)',
    iron: 'Serum Iron',
    albumin: 'Albumin',
  };

  for (const marker of Object.keys(markers) as (keyof BloodMarkers)[]) {
    const value = markers[marker];
    if (value === undefined) continue;
    const interp = getMarkerInterpretation(marker, value, profile.gender);
    if (interp.status === 'low') {
      deficiencies.push(DEFICIENCY_LABELS[marker] ?? `${marker}`);
    }
  }

  return deficiencies;
}

export function identifyRisks(markers: BloodMarkers, profile: Pick<UserProfile, 'gender'>): string[] {
  const risks: string[] = [];

  const isRiskStatus = (status: ReturnType<typeof getMarkerInterpretation>['status']) =>
    status === 'borderline' || status === 'high' || status === 'critical';

  const metabolicMarkers: (keyof BloodMarkers)[] = ['glucose', 'hba1c', 'fastingInsulin'];
  const cardiovascularMarkers: (keyof BloodMarkers)[] = ['totalCholesterol', 'ldl', 'hdl', 'triglycerides'];
  const hepaticMarkers: (keyof BloodMarkers)[] = ['alt', 'ast'];
  const renalMarkers: (keyof BloodMarkers)[] = ['creatinine', 'uricAcid'];

  for (const marker of [...metabolicMarkers, ...cardiovascularMarkers, ...hepaticMarkers, ...renalMarkers]) {
    const value = markers[marker];
    if (value === undefined) continue;

    const interp = getMarkerInterpretation(marker, value, profile.gender);
    if (isRiskStatus(interp.status)) {
      risks.push(`${MARKER_NAMES[marker]}: ${interp.label}`);
    }
  }

  return risks;
}

export function calculateCalorieTiers(tdee: number): CalorieTier[] {
  const floor = 1200;
  const makeTier = (label: string, weeklyChange: string, targetOffset: number): CalorieTier => {
    const dailyCalories = Math.max(floor, Math.round(tdee + targetOffset));
    // Actual daily change from TDEE (negative = deficit, positive = surplus)
    const dailyChange = dailyCalories - Math.round(tdee);
    return { label, weeklyChange, dailyCalories, dailyChange };
  };

  return [
    makeTier('Lose 1.5 lb/wk', '-1.5 lb', -750),
    makeTier('Lose 1 lb/wk', '-1 lb', -500),
    makeTier('Lose 0.5 lb/wk', '-0.5 lb', -250),
    makeTier('Maintain', '0 lb', 0),
    makeTier('Gain 0.5 lb/wk', '+0.5 lb', 250),
    makeTier('Gain 1 lb/wk', '+1 lb', 500),
  ];
}

export function calculateMacros(calories: number, goal: 'lose' | 'maintain' | 'gain'): MacroBreakdown {
  const ratios = goal === 'lose'
    ? { p: 40, c: 30, f: 30 }
    : goal === 'gain'
    ? { p: 35, c: 40, f: 25 }
    : { p: 30, c: 40, f: 30 };

  const proteinGrams = Math.round((calories * ratios.p / 100) / 4);
  const carbGrams = Math.round((calories * ratios.c / 100) / 4);
  // Compute fat as residual to prevent rounding drift (total always matches)
  const fatGrams = Math.round((calories - proteinGrams * 4 - carbGrams * 4) / 9);

  return {
    protein: { grams: proteinGrams, pct: ratios.p },
    carbs: { grams: carbGrams, pct: ratios.c },
    fat: { grams: fatGrams, pct: ratios.f },
    calories,
  };
}

export function calculateBMI(weightLbs: number, heightFeet: number, heightInches: number): { bmi: number; category: string } {
  const totalInches = heightFeet * 12 + heightInches;
  const bmi = (weightLbs * 703) / (totalInches * totalInches);
  const rounded = Math.round(bmi * 10) / 10;

  let category: string;
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';

  return { bmi: rounded, category };
}

const ACTIVITY_TIERS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very-active'];

export function calculateWaistToHipRatio(
  waistInches: number,
  hipInches: number,
  gender: UserProfile['gender'],
): { ratio: number; interpretation: string } {
  const ratio = Math.round((waistInches / hipInches) * 100) / 100;
  let interpretation: string;
  // WHO waist-to-hip ratio thresholds (male vs female)
  if (gender === 'male' && ratio < 0.9) {
    interpretation = 'Normal';
  } else if (gender === 'male' && ratio < 0.95) {
    interpretation = 'Elevated';
  } else if (gender === 'male') {
    interpretation = 'High Risk';
  } else if (ratio < 0.8) {
    interpretation = 'Normal';
  } else if (ratio < 0.85) {
    interpretation = 'Elevated';
  } else {
    interpretation = 'High Risk';
  }
  return { ratio, interpretation };
}

export function calculateRecommendations(
  profile: UserProfile,
  markers: BloodMarkers,
  deficiencies: string[]
): PersonalizedRecs {
  const { bmi, category: bmiCategory } = calculateBMI(profile.weightLbs, profile.heightFeet, profile.heightInches);

  // Water: ~0.5 oz per lb bodyweight + 16 oz per activity tier above sedentary
  // Base rate from National Academies of Sciences (2005) adequate intake guidelines;
  // activity add-on approximates ACSM fluid replacement recommendations (~480 mL/session).
  const activityIdx = ACTIVITY_TIERS.indexOf(profile.activityLevel);
  const waterIntakeOz = Math.round(profile.weightLbs * 0.5 + activityIdx * 16);

  // LDL/HDL ratio
  let ldlHdlRatio: number | null = null;
  let ldlHdlInterpretation: string | null = null;
  if (markers.ldl !== undefined && markers.hdl !== undefined && markers.hdl > 0) {
    ldlHdlRatio = Math.round((markers.ldl / markers.hdl) * 10) / 10;
    if (ldlHdlRatio < 2.0) ldlHdlInterpretation = 'Optimal';
    else if (ldlHdlRatio < 3.0) ldlHdlInterpretation = 'Normal';
    else if (ldlHdlRatio < 4.0) ldlHdlInterpretation = 'Borderline';
    else ldlHdlInterpretation = 'High Risk';
  }

  // TG/HDL ratio
  let tgHdlRatio: number | null = null;
  let tgHdlInterpretation: string | null = null;
  if (markers.triglycerides !== undefined && markers.hdl !== undefined && markers.hdl > 0) {
    tgHdlRatio = Math.round((markers.triglycerides / markers.hdl) * 10) / 10;
    if (tgHdlRatio < 2.0) tgHdlInterpretation = 'Optimal';
    else if (tgHdlRatio < 3.0) tgHdlInterpretation = 'Borderline';
    else tgHdlInterpretation = 'High Risk (Insulin Resistant)';
  }

  // HOMA-IR
  let homaIR: number | null = null;
  let homaIRInterpretation: string | null = null;
  if (markers.glucose !== undefined && markers.fastingInsulin !== undefined && markers.glucose > 0 && markers.fastingInsulin > 0) {
    homaIR = Math.round(((markers.glucose * markers.fastingInsulin) / 405) * 10) / 10;
    if (homaIR < 1.0) homaIRInterpretation = 'Optimal';
    else if (homaIR < 2.0) homaIRInterpretation = 'Normal';
    else if (homaIR < 3.0) homaIRInterpretation = 'Early Insulin Resistance';
    else homaIRInterpretation = 'Significant Insulin Resistance';
  }

  // TyG index (Triglyceride-Glucose index)
  // Common form: TyG = ln( (TG [mg/dL] * glucose [mg/dL]) / 2 )
  // We only show TyG when TG + glucose + HDL are all present (complete lipid + glucose panel context).
  let tyg: number | null = null;
  let tygInterpretation: string | null = null;
  if (
    markers.triglycerides !== undefined &&
    markers.glucose !== undefined &&
    markers.hdl !== undefined &&
    markers.triglycerides > 0 &&
    markers.glucose > 0 &&
    markers.hdl > 0
  ) {
    tyg = Math.round(Math.log((markers.triglycerides * markers.glucose) / 2) * 100) / 100;
    if (tyg < 8.0) tygInterpretation = 'Low Insulin Resistance Risk';
    else if (tyg < 9.0) tygInterpretation = 'Moderate Insulin Resistance Risk';
    else tygInterpretation = 'High Insulin Resistance Risk';
  }

  // Supplements from deficiencies
  const supplementMap: Record<string, { dosage: string; reason: string }> = {
    'Vitamin D': { dosage: '2000-4000 IU daily', reason: 'Low vitamin D levels' },
    'Vitamin B12': { dosage: '1000 mcg daily', reason: 'B12 deficiency detected' },
    'Iron (Ferritin)': { dosage: '18-27 mg daily (with vitamin C)', reason: 'Low ferritin stores' },
    'Serum Iron': { dosage: '18-27 mg daily (with vitamin C)', reason: 'Low serum iron levels' },
    'Albumin': { dosage: 'Increase dietary protein intake', reason: 'Low albumin — may indicate poor nutrition or liver issues' },
  };
  const supplements = deficiencies
    .filter((d) => supplementMap[d])
    .map((d) => ({ name: d, ...supplementMap[d] }));

  // Exercise suggestions
  const exerciseSuggestions: string[] = [];
  if (activityIdx <= 1) {
    exerciseSuggestions.push('Start with 20-30 min daily walks to build a base');
    exerciseSuggestions.push('Add 2 bodyweight strength sessions per week');
  } else if (activityIdx <= 2) {
    exerciseSuggestions.push('Increase to 150 min moderate cardio per week');
    exerciseSuggestions.push('Add 3 resistance training sessions per week');
  } else {
    exerciseSuggestions.push('Maintain current activity with periodized training');
    exerciseSuggestions.push('Include mobility and recovery work');
  }
  if (markers.ldl !== undefined && markers.ldl >= 130) {
    exerciseSuggestions.push('Prioritize steady-state cardio (30+ min) to support cholesterol levels');
  }
  if (markers.glucose !== undefined && markers.glucose >= 100) {
    exerciseSuggestions.push('Post-meal walks (15 min) can help regulate blood sugar');
  }

  // Waist-to-hip ratio
  let waistToHipRatio: number | null = null;
  let waistToHipInterpretation: string | null = null;
  if (profile.waistInches && profile.hipInches && profile.hipInches > 0) {
    const whr = calculateWaistToHipRatio(profile.waistInches, profile.hipInches, profile.gender);
    waistToHipRatio = whr.ratio;
    waistToHipInterpretation = whr.interpretation;
  }

  // Goal-specific meal timing suggestions
  // Splits based on goal: lose (front-loaded), maintain (balanced), gain (high-frequency)
  const tdeeResult = calculateTDEE(profile);
  const mealTiming = calculateMealTiming(tdeeResult.targetCalories, profile.goal);

  return {
    bmi,
    bmiCategory,
    waterIntakeOz,
    ldlHdlRatio,
    ldlHdlInterpretation,
    tgHdlRatio,
    tgHdlInterpretation,
    homaIR,
    homaIRInterpretation,
    tyg,
    tygInterpretation,
    waistToHipRatio,
    waistToHipInterpretation,
    supplements,
    exerciseSuggestions,
    mealTiming,
  };
}

/**
 * Goal-specific meal timing suggestions.
 *
 * - Lose: front-loaded pattern (larger breakfast/lunch, lighter dinner) to leverage
 *   higher morning insulin sensitivity and thermic effect.
 * - Maintain: balanced 3-meal pattern with an optional snack.
 * - Gain: high-frequency 4-meal pattern to maximize protein synthesis windows
 *   (~0.4 g/kg per meal, Schoenfeld & Aragon 2018) and caloric throughput.
 */
function calculateMealTiming(
  targetCalories: number,
  goal: UserProfile['goal'],
): MealTimingSuggestion[] {
  if (goal === 'lose') {
    // Front-loaded: 35% breakfast, 35% lunch, 10% snack, 20% dinner
    return [
      { meal: 'Breakfast', time: '7:00–8:00 AM', calories: Math.round(targetCalories * 0.35), focus: 'Protein + fiber to sustain satiety' },
      { meal: 'Lunch', time: '12:00–1:00 PM', calories: Math.round(targetCalories * 0.35), focus: 'Lean protein + complex carbs' },
      { meal: 'Snack', time: '3:00–4:00 PM', calories: Math.round(targetCalories * 0.10), focus: 'Protein-rich (Greek yogurt, nuts)' },
      { meal: 'Dinner', time: '6:00–7:00 PM', calories: Math.round(targetCalories * 0.20), focus: 'Light protein + vegetables, limit carbs' },
    ];
  }

  if (goal === 'gain') {
    // High-frequency: 25% each for 4 meals to maximize MPS
    return [
      { meal: 'Breakfast', time: '7:00–8:00 AM', calories: Math.round(targetCalories * 0.25), focus: 'Protein + carbs to break overnight fast' },
      { meal: 'Lunch', time: '11:30 AM–12:30 PM', calories: Math.round(targetCalories * 0.25), focus: 'Balanced macro-dense meal' },
      { meal: 'Post-Workout', time: '3:00–4:00 PM', calories: Math.round(targetCalories * 0.25), focus: 'Fast carbs + protein for recovery' },
      { meal: 'Dinner', time: '7:00–8:00 PM', calories: Math.round(targetCalories * 0.25), focus: 'Calorie-dense, include healthy fats' },
    ];
  }

  // Maintain: balanced 3 meals + snack
  return [
    { meal: 'Breakfast', time: '7:00–8:00 AM', calories: Math.round(targetCalories * 0.30), focus: 'Balanced protein, carbs, and fats' },
    { meal: 'Lunch', time: '12:00–1:00 PM', calories: Math.round(targetCalories * 0.30), focus: 'Well-rounded, nutrient-dense meal' },
    { meal: 'Snack', time: '3:30–4:30 PM', calories: Math.round(targetCalories * 0.10), focus: 'Light protein or fruit' },
    { meal: 'Dinner', time: '6:30–7:30 PM', calories: Math.round(targetCalories * 0.30), focus: 'Balanced macros, moderate portions' },
  ];
}

export function deriveMarkers(markers: BloodMarkers): { ldl?: number; nonHdl?: number } {
  const derived: { ldl?: number; nonHdl?: number } = {};

  // Non-HDL = TC - HDL (only when HDL sanity-check passes)
  if (
    markers.nonHdl === undefined &&
    markers.totalCholesterol !== undefined &&
    markers.hdl !== undefined &&
    markers.hdl <= markers.totalCholesterol
  ) {
    const nonHdl = Math.round(markers.totalCholesterol - markers.hdl);
    if (Number.isFinite(nonHdl) && nonHdl >= 0) derived.nonHdl = nonHdl;
  }

  // LDL: try Friedewald first, then fall back to Iranian formula when Friedewald is invalid/unreliable.
  if (markers.ldl === undefined) {
    const tc = markers.totalCholesterol;
    const hdl = markers.hdl;
    const tg = markers.triglycerides;

    if (tc !== undefined && hdl !== undefined && tg !== undefined) {
      let friedewaldValid = false;
      let friedewaldLdl: number | null = null;

      if (tg < 400) {
        const derivedFried = Math.round(tc - hdl - tg / 5);
        if (Number.isFinite(derivedFried) && derivedFried > 0) {
          friedewaldValid = true;
          friedewaldLdl = derivedFried;
        }
      }

      if (friedewaldValid && friedewaldLdl !== null) {
        derived.ldl = friedewaldLdl;
      } else {
        // Iranian LDL formula (works better when TG is higher).
        const derivedIranian = Math.round(tc / 1.19 + tg / 1.9 - hdl / 1.1 - 38);
        if (Number.isFinite(derivedIranian) && derivedIranian > 0) {
          derived.ldl = derivedIranian;
        }
      }
    }
  }

  return derived;
}

export function calculateASCVDRiskScore(profile: UserProfile, markers: BloodMarkers): ASCVDResult {
  return calculateASCVDRisk(profile, markers);
}
