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

  // Use Katch-McArdle when body fat % is available (more accurate for lean/overweight individuals),
  // otherwise fall back to Mifflin-St Jeor.
  let bmr: number;

  if (profile.bodyFatPercentage !== undefined && profile.bodyFatPercentage > 0) {
    // Katch-McArdle: BMR = 370 + 21.6 × LBM(kg)
    const leanBodyMassKg = weightKg * (1 - profile.bodyFatPercentage / 100);
    bmr = 370 + 21.6 * leanBodyMassKg;
  } else if (profile.gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const tdee = Math.round(bmr * activityMultiplier);

  // Adjust for goal
  // Deficit/surplus ratios per common sports nutrition guidelines (ISSN, NASM):
  // - Aggressive cut: 30% deficit (contest prep pace, risk of muscle loss — Helms et al., 2014)
  // - Moderate cut: 20% deficit (standard recommendation, preserves lean mass)
  // - Mild cut: 10% deficit (slow & sustainable, minimal metabolic adaptation)
  // - Lean bulk: 10% surplus (minimizes fat gain — Iraki et al., 2019)
  // - Aggressive bulk: 20% surplus (faster mass gain, higher fat accrual)
  const goalMultipliers: Record<UserProfile['goal'], number> = {
    'lose-aggressive': 0.7,
    'lose-moderate': 0.8,
    'lose-mild': 0.9,
    'maintain': 1.0,
    'gain-lean': 1.1,
    'gain-aggressive': 1.2,
  };
  const targetCalories = Math.round(tdee * goalMultipliers[profile.goal]);

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
    recommendation: profile.goal.startsWith('lose')
      ? `To lose weight sustainably, aim for ${tdee.targetCalories} calories daily.`
      : profile.goal.startsWith('gain')
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

  // Cross-marker pattern insights — detect systemic patterns, not just individual flags
  insights.push(...generateCrossMarkerInsights(profile, markers));

  return insights;
}

function generateCrossMarkerInsights(profile: UserProfile, markers: BloodMarkers): Insight[] {
  const insights: Insight[] = [];

  // --- Metabolic Syndrome cluster (IDF/ATP III criteria) ---
  const metSynCriteria = [
    markers.glucose !== undefined && markers.glucose >= 100,
    markers.triglycerides !== undefined && markers.triglycerides >= 150,
    markers.hdl !== undefined && markers.hdl < (profile.gender === 'male' ? 40 : 50),
    markers.hba1c !== undefined && markers.hba1c >= 5.7,
    profile.waistInches !== undefined && profile.waistInches > (profile.gender === 'male' ? 40 : 35),
  ].filter(Boolean).length;

  if (metSynCriteria >= 3) {
    insights.push({
      type: 'danger',
      title: 'Metabolic Syndrome Pattern',
      description: `${metSynCriteria} of 5 metabolic syndrome criteria are met (elevated glucose, triglycerides, waist circumference, low HDL, or HbA1c).`,
      recommendation: 'Prioritize 30+ min aerobic exercise 4x/week, reduce refined carbs, increase soluble fiber (10+ g/day), and consider consulting an endocrinologist.',
    });
  }

  // --- Postprandial hyperglycemia: elevated HbA1c with normal fasting glucose ---
  if (
    markers.hba1c !== undefined && markers.hba1c >= 5.7 &&
    markers.glucose !== undefined && markers.glucose < 100
  ) {
    insights.push({
      type: 'warning',
      title: 'Likely Postprandial Hyperglycemia',
      description: 'HbA1c is elevated despite normal fasting glucose, suggesting blood sugar spikes after meals.',
      recommendation: 'Take 15 min walks after meals, eat carbs with protein/fat (not alone), reduce meal carb load by 20%, and consider a continuous glucose monitor (CGM).',
    });
  }

  // --- Nutrient malabsorption cluster ---
  const lowNutrients = [
    markers.ferritin !== undefined && markers.ferritin < 20,
    markers.vitaminB12 !== undefined && markers.vitaminB12 < 300,
    markers.albumin !== undefined && markers.albumin < 3.5,
    markers.iron !== undefined && markers.iron < 60,
  ].filter(Boolean).length;

  if (lowNutrients >= 2) {
    insights.push({
      type: 'warning',
      title: 'Possible Nutrient Malabsorption',
      description: `${lowNutrients} micronutrient markers are below optimal, which may indicate a dietary intake or GI absorption issue.`,
      recommendation: 'Consider testing for celiac disease (tTG antibody), assess dietary variety, and evaluate GI health with your provider if symptoms are present.',
    });
  }

  // --- Hyperuricemia + metabolic cluster ---
  if (
    markers.uricAcid !== undefined && markers.uricAcid > 7.0 &&
    ((markers.triglycerides !== undefined && markers.triglycerides > 150) ||
     (markers.glucose !== undefined && markers.glucose >= 100))
  ) {
    insights.push({
      type: 'warning',
      title: 'Hyperuricemia with Metabolic Risk',
      description: 'Elevated uric acid combined with metabolic markers increases gout and cardiovascular risk.',
      recommendation: 'Reduce fructose and alcohol, stay well hydrated (2+ L/day), prioritize weight loss if overweight, and limit purine-rich foods.',
    });
  }

  // --- Insulin resistance convergence (HOMA-IR + TyG + TG/HDL all pointing same way) ---
  const homaIR = (markers.glucose !== undefined && markers.fastingInsulin !== undefined)
    ? (markers.glucose * markers.fastingInsulin) / 405
    : null;
  const tgHdlRatio = (markers.triglycerides !== undefined && markers.hdl !== undefined && markers.hdl > 0)
    ? markers.triglycerides / markers.hdl
    : null;

  const irSignals = [
    homaIR !== null && homaIR > 2.0,
    tgHdlRatio !== null && tgHdlRatio > 3.0,
    markers.hba1c !== undefined && markers.hba1c >= 5.7,
  ].filter(Boolean).length;

  if (irSignals >= 2) {
    insights.push({
      type: 'danger',
      title: 'Strong Insulin Resistance Signal',
      description: 'Multiple independent markers (HOMA-IR, TG/HDL ratio, HbA1c) converge on insulin resistance.',
      recommendation: 'Prioritize resistance training (builds insulin-sensitive muscle), reduce refined carbs, consider time-restricted eating (16:8), and discuss metformin with your doctor if BMI > 30.',
    });
  }

  // --- Liver stress + inflammation ---
  if (
    ((markers.alt !== undefined && markers.alt > 45) || (markers.ast !== undefined && markers.ast > 40)) &&
    markers.hsCRP !== undefined && markers.hsCRP > 3.0
  ) {
    insights.push({
      type: 'warning',
      title: 'Hepatic Stress with Systemic Inflammation',
      description: 'Elevated liver enzymes combined with high hs-CRP suggest liver inflammation that may be part of a systemic pattern.',
      recommendation: 'Limit alcohol, reduce processed foods, increase omega-3 intake, and discuss liver imaging (ultrasound) with your doctor.',
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

export function calculateMacros(
  calories: number,
  goal: UserProfile['goal'],
  profile?: Pick<UserProfile, 'weightLbs' | 'gender'>,
  markers?: BloodMarkers,
): MacroBreakdown {
  // --- Protein: body-weight-based (g per lb) with goal-specific targets ---
  // ISSN position stand: 1.6–2.2 g/kg (≈ 0.73–1.0 g/lb) for body composition goals.
  // Deeper deficits need higher protein to preserve lean mass (Helms et al., 2014).
  const proteinPerLb: Record<UserProfile['goal'], number> = {
    'lose-aggressive': 1.0,   // maximum protein retention in steep deficit
    'lose-moderate':   0.9,
    'lose-mild':       0.85,
    'maintain':        0.8,
    'gain-lean':       0.9,
    'gain-aggressive': 0.85,
  };

  const weightLbs = profile?.weightLbs ?? 154; // fallback to ~70 kg
  let proteinGrams = Math.round(weightLbs * proteinPerLb[goal]);

  // Cap protein calories at 45% of total to leave room for carbs/fat
  const maxProteinCal = Math.round(calories * 0.45);
  proteinGrams = Math.min(proteinGrams, Math.round(maxProteinCal / 4));

  const proteinCal = proteinGrams * 4;
  const remaining = calories - proteinCal;

  // --- Carb/fat split: base ratios adjusted by insulin resistance markers ---
  // Default carb fraction of remaining calories (after protein)
  const baseCarbFractions: Record<UserProfile['goal'], number> = {
    'lose-aggressive': 0.45,
    'lose-moderate':   0.50,
    'lose-mild':       0.55,
    'maintain':        0.55,
    'gain-lean':       0.60,
    'gain-aggressive': 0.65,
  };
  let carbFraction = baseCarbFractions[goal];

  // Adjust for insulin resistance: reduce carbs, increase fat
  if (markers) {
    const homaIR = (markers.glucose !== undefined && markers.fastingInsulin !== undefined)
      ? (markers.glucose * markers.fastingInsulin) / 405
      : null;
    if (homaIR !== null && homaIR > 2.0) {
      carbFraction -= 0.10; // shift 10% from carbs to fat for IR
    }
    if (markers.triglycerides !== undefined && markers.triglycerides > 150) {
      carbFraction -= 0.05; // further reduce carbs for high TG
    }
    // Floor: don't go below 30% of remaining as carbs
    carbFraction = Math.max(0.30, carbFraction);
  }

  const carbGrams = Math.round((remaining * carbFraction) / 4);
  const fatGrams = Math.round((remaining - carbGrams * 4) / 9);

  // Compute actual percentages
  const pctP = Math.round((proteinCal / calories) * 100);
  const pctC = Math.round((carbGrams * 4 / calories) * 100);
  const pctF = 100 - pctP - pctC;

  return {
    protein: { grams: proteinGrams, pct: pctP },
    carbs: { grams: carbGrams, pct: pctC },
    fat: { grams: fatGrams, pct: pctF },
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

  // --- Supplements: severity-tiered dosing for deficiencies + marker-driven additions ---
  const supplements: { name: string; dosage: string; reason: string }[] = [];

  // Vitamin D — tiered by severity
  if (markers.vitaminD !== undefined) {
    if (markers.vitaminD < 12) {
      supplements.push({ name: 'Vitamin D3', dosage: '5000–6000 IU daily', reason: 'Severe deficiency (<12 ng/mL) — load aggressively, retest in 8 weeks' });
    } else if (markers.vitaminD < 20) {
      supplements.push({ name: 'Vitamin D3', dosage: '3000–4000 IU daily', reason: 'Deficiency (<20 ng/mL) — supplement to reach 40–60 ng/mL' });
    } else if (markers.vitaminD < 30) {
      supplements.push({ name: 'Vitamin D3', dosage: '2000 IU daily', reason: 'Insufficiency (<30 ng/mL) — maintenance dose to optimize levels' });
    }
  } else if (deficiencies.includes('Vitamin D')) {
    supplements.push({ name: 'Vitamin D3', dosage: '2000–4000 IU daily', reason: 'Low vitamin D levels' });
  }

  // Vitamin B12
  if (markers.vitaminB12 !== undefined && markers.vitaminB12 < 300) {
    const dosage = markers.vitaminB12 < 200
      ? '2000 mcg sublingual daily (or discuss injections with your doctor)'
      : '1000 mcg daily';
    supplements.push({ name: 'Vitamin B12', dosage, reason: `B12 at ${markers.vitaminB12} pg/mL — below optimal range (>400)` });
  } else if (deficiencies.includes('Vitamin B12')) {
    supplements.push({ name: 'Vitamin B12', dosage: '1000 mcg daily', reason: 'B12 deficiency detected' });
  }

  // Iron — only if not inflamed (CRP check)
  const ironDeficient = deficiencies.includes('Iron (Ferritin)') || deficiencies.includes('Serum Iron');
  if (ironDeficient) {
    const inflamed = markers.hsCRP !== undefined && markers.hsCRP > 3.0;
    if (inflamed) {
      supplements.push({ name: 'Iron', dosage: 'Defer until inflammation resolves', reason: 'Low iron stores, but elevated hs-CRP — iron supplementation during inflammation can be counterproductive. Resolve inflammation first.' });
    } else {
      const dosage = profile.gender === 'female'
        ? '18–27 mg daily (with vitamin C for absorption)'
        : '8–18 mg daily (with vitamin C for absorption)';
      supplements.push({ name: 'Iron', dosage, reason: 'Low ferritin/iron stores — take on an empty stomach or with vitamin C' });
    }
  }

  // Albumin
  if (deficiencies.includes('Albumin')) {
    supplements.push({ name: 'Dietary Protein', dosage: 'Increase to 1.2+ g/kg/day', reason: 'Low albumin — prioritize complete protein sources (eggs, dairy, poultry, fish)' });
  }

  // Omega-3 — triggered by lipid markers
  if (
    (markers.triglycerides !== undefined && markers.triglycerides > 150) ||
    (markers.apoB !== undefined && markers.apoB > 100) ||
    (markers.hsCRP !== undefined && markers.hsCRP > 2.0)
  ) {
    const reasons: string[] = [];
    if (markers.triglycerides !== undefined && markers.triglycerides > 150) reasons.push('elevated triglycerides');
    if (markers.apoB !== undefined && markers.apoB > 100) reasons.push('high ApoB');
    if (markers.hsCRP !== undefined && markers.hsCRP > 2.0) reasons.push('elevated hs-CRP');
    supplements.push({ name: 'Omega-3 (EPA/DHA)', dosage: '2–3 g EPA+DHA daily', reason: `Supports lipid profile and reduces inflammation (${reasons.join(', ')})` });
  }

  // Magnesium — broadly beneficial, recommended when metabolic markers are off
  const homaIRVal = (markers.glucose !== undefined && markers.fastingInsulin !== undefined)
    ? (markers.glucose * markers.fastingInsulin) / 405
    : null;
  if (
    (homaIRVal !== null && homaIRVal > 1.5) ||
    (markers.glucose !== undefined && markers.glucose >= 100) ||
    (markers.hba1c !== undefined && markers.hba1c >= 5.7)
  ) {
    supplements.push({ name: 'Magnesium Glycinate', dosage: '300–400 mg daily', reason: 'Supports insulin sensitivity, metabolic health, and muscle recovery — often depleted in insulin-resistant states' });
  }

  // Creatine — for gain goals or active individuals
  if (profile.goal.startsWith('gain') || profile.activityLevel === 'active' || profile.activityLevel === 'very-active') {
    supplements.push({ name: 'Creatine Monohydrate', dosage: '3–5 g daily', reason: 'Supports strength, power output, and lean mass — most studied sports supplement (ISSN position stand)' });
  }

  // --- Exercise suggestions: activity-level baseline + marker-driven adjustments ---
  const exerciseSuggestions: string[] = [];

  // Baseline by activity level
  if (activityIdx <= 1) {
    exerciseSuggestions.push('Start with 20–30 min daily walks to build a base');
    exerciseSuggestions.push('Add 2 bodyweight strength sessions per week');
  } else if (activityIdx <= 2) {
    exerciseSuggestions.push('Increase to 150 min moderate cardio per week');
    exerciseSuggestions.push('Add 3 resistance training sessions per week');
  } else {
    exerciseSuggestions.push('Maintain current activity with periodized training');
    exerciseSuggestions.push('Include mobility and recovery work');
  }

  // Marker-driven additions
  if (markers.ldl !== undefined && markers.ldl >= 130) {
    exerciseSuggestions.push('Prioritize steady-state cardio (30+ min) to support cholesterol levels');
  }
  if (markers.glucose !== undefined && markers.glucose >= 100) {
    exerciseSuggestions.push('Post-meal walks (15 min) help regulate blood sugar — especially after carb-heavy meals');
  }
  if (markers.ferritin !== undefined && markers.ferritin < 30) {
    exerciseSuggestions.push('Caution with intense cardio while ferritin is low — risk of exercise intolerance and fatigue. Begin iron supplementation 2+ weeks before increasing training volume.');
  }
  if (markers.tsh !== undefined && markers.tsh > 5) {
    exerciseSuggestions.push('Elevated TSH suggests hypothyroid tendency — favor moderate cardio (3x30 min) over high-intensity. Avoid extreme volume until thyroid is managed.');
  }
  if ((markers.alt !== undefined && markers.alt > 50) || (markers.ast !== undefined && markers.ast > 50)) {
    exerciseSuggestions.push('Elevated liver enzymes — reduce high-intensity work temporarily. Focus on steady-state aerobic exercise to support liver recovery.');
  }
  if (markers.uricAcid !== undefined && markers.uricAcid > 7.0) {
    exerciseSuggestions.push('High uric acid increases gout risk — stay well hydrated during exercise, avoid fructose-heavy sports drinks, and favor low-impact activities during flares.');
  }
  if (markers.hsCRP !== undefined && markers.hsCRP > 3.0) {
    exerciseSuggestions.push('Elevated hs-CRP indicates systemic inflammation — consider anti-inflammatory activities (yoga, swimming, walking) alongside strength training.');
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
  if (goal.startsWith('lose')) {
    // Front-loaded: 35% breakfast, 35% lunch, 10% snack, 20% dinner
    return [
      { meal: 'Breakfast', time: '7:00–8:00 AM', calories: Math.round(targetCalories * 0.35), focus: 'Protein + fiber to sustain satiety' },
      { meal: 'Lunch', time: '12:00–1:00 PM', calories: Math.round(targetCalories * 0.35), focus: 'Lean protein + complex carbs' },
      { meal: 'Snack', time: '3:00–4:00 PM', calories: Math.round(targetCalories * 0.10), focus: 'Protein-rich (Greek yogurt, nuts)' },
      { meal: 'Dinner', time: '6:00–7:00 PM', calories: Math.round(targetCalories * 0.20), focus: 'Light protein + vegetables, limit carbs' },
    ];
  }

  if (goal.startsWith('gain')) {
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
