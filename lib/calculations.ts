import { UserProfile, ActivityLevel, TDEEResult, BloodMarkers, HealthScore, Insight, CalorieTier, MacroBreakdown, PersonalizedRecs, MealTimingSuggestion, ExerciseSession, ExerciseType, ExerciseTemplate, FocusGoal, DietaryPattern, SupplementRec } from '@/types';
import { getMarkerInterpretation } from '@/lib/bloodParser';
import { calculateASCVDRisk, type ASCVDResult } from '@/lib/riskModels';

/** Human-readable names for blood markers — shared across insight generation, risk identification, and UI. */
export const MARKER_NAMES: Record<keyof BloodMarkers, string> = {
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

/** Shorter display labels for compact UI contexts (charts, trend tables). */
export const MARKER_SHORT_NAMES: Record<keyof BloodMarkers, string> = {
  glucose: 'Glucose',
  hba1c: 'HbA1c',
  totalCholesterol: 'Total Cholesterol',
  nonHdl: 'Non-HDL',
  ldl: 'LDL',
  hdl: 'HDL',
  triglycerides: 'Triglycerides',
  apoB: 'ApoB',
  hsCRP: 'hs-CRP',
  tsh: 'TSH',
  vitaminD: 'Vitamin D',
  vitaminB12: 'Vitamin B12',
  ferritin: 'Ferritin',
  iron: 'Iron',
  alt: 'ALT',
  ast: 'AST',
  albumin: 'Albumin',
  creatinine: 'Creatinine',
  uricAcid: 'Uric Acid',
  fastingInsulin: 'Fasting Insulin',
};

/** HOMA-IR: (fasting glucose × fasting insulin) / 405. Returns null if either input is missing. */
function computeHOMAIR(glucose: number | undefined, insulin: number | undefined): number | null {
  if (glucose === undefined || insulin === undefined) return null;
  return (glucose * insulin) / 405;
}

const CV_MARKERS: (keyof BloodMarkers)[] = [
  'totalCholesterol', 'ldl', 'hdl', 'triglycerides', 'nonHdl', 'apoB', 'hsCRP',
];

/** Active focus goals (empty array if none). */
export function focusGoalList(profile: Pick<UserProfile, 'focusGoal'>): FocusGoal[] {
  return profile.focusGoal ?? [];
}

function hasFocusGoal(profile: Pick<UserProfile, 'focusGoal'>, g: FocusGoal): boolean {
  return focusGoalList(profile).includes(g);
}

function isCardiovascularFamilyRiskStatus(
  marker: keyof BloodMarkers,
  status: ReturnType<typeof getMarkerInterpretation>['status'],
): boolean {
  if (status === 'borderline' || status === 'high' || status === 'critical') return true;
  if (marker === 'hdl' && status === 'low') return true;
  return false;
}

const FOCUS_PROTEIN_PER_LB: Record<FocusGoal, number> = {
  'fat-loss': 1.0,
  'muscle-gain': 0.9,
  'metabolic-health': 0.85,
  'endurance': 0.75,
  'longevity': 0.8,
  'general-wellness': 0.8,
};

const FOCUS_CARB_DELTA: Record<FocusGoal, number> = {
  'fat-loss': -0.10,
  'muscle-gain': 0.10,
  'metabolic-health': -0.10,
  'endurance': 0.15,
  'longevity': -0.05,
  'general-wellness': 0,
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  'sedentary': 1.2,
  'light': 1.375,
  'moderate': 1.55,
  'active': 1.725,
  'very-active': 1.9,
};

// MET values for exercise types (Compendium of Physical Activities)
const EXERCISE_METS: Record<ExerciseType, number> = {
  'strength': 5,
  'cardio-low': 3.5,
  'cardio-moderate': 6,
  'cardio-high': 9,
  'sports': 7,
  'flexibility': 2.5,
};

// Occupation NEAT offsets (kcal/day above basal desk work)
const OCCUPATION_NEAT: Record<string, number> = {
  'desk': 0,
  'standing': 150,
  'light-labor': 350,
  'heavy-labor': 600,
};

// Exercise template presets → ExerciseSession[]
const EXERCISE_TEMPLATE_SESSIONS: Record<Exclude<ExerciseTemplate, 'custom'>, ExerciseSession[]> = {
  'strength-focused': [
    { type: 'strength', durationMinutes: 50, frequencyPerWeek: 4 },
    { type: 'cardio-moderate', durationMinutes: 25, frequencyPerWeek: 1 },
  ],
  'cardio-focused': [
    { type: 'strength', durationMinutes: 40, frequencyPerWeek: 2 },
    { type: 'cardio-moderate', durationMinutes: 35, frequencyPerWeek: 3 },
  ],
  'balanced': [
    { type: 'strength', durationMinutes: 45, frequencyPerWeek: 3 },
    { type: 'cardio-moderate', durationMinutes: 30, frequencyPerWeek: 2 },
  ],
  'light-recovery': [
    { type: 'flexibility', durationMinutes: 30, frequencyPerWeek: 2 },
    { type: 'cardio-low', durationMinutes: 30, frequencyPerWeek: 2 },
  ],
  'athlete': [
    { type: 'strength', durationMinutes: 60, frequencyPerWeek: 3 },
    { type: 'cardio-high', durationMinutes: 30, frequencyPerWeek: 2 },
    { type: 'sports', durationMinutes: 60, frequencyPerWeek: 1 },
  ],
};

/** Resolve exercise sessions from template or custom input. */
export function resolveExerciseSessions(profile: UserProfile): ExerciseSession[] {
  if (profile.exerciseSessions && profile.exerciseSessions.length > 0) {
    return profile.exerciseSessions;
  }
  if (profile.exerciseTemplate && profile.exerciseTemplate !== 'custom') {
    return EXERCISE_TEMPLATE_SESSIONS[profile.exerciseTemplate];
  }
  return [];
}

/** Calculate daily exercise calories from sessions using MET values. */
function calculateExerciseCalories(sessions: ExerciseSession[], weightKg: number): number {
  let weeklyTotal = 0;
  for (const session of sessions) {
    const met = EXERCISE_METS[session.type];
    // MET formula: kcal = MET × weightKg × hours
    // Subtract 1 MET (resting) to avoid double-counting BMR
    weeklyTotal += (met - 1) * weightKg * (session.durationMinutes / 60) * session.frequencyPerWeek;
  }
  return Math.round(weeklyTotal / 7); // daily average
}

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

  // Advanced activity: component-based TDEE (BMR + NEAT + exercise)
  // Simple mode: multiplier-based TDEE (BMR × activity multiplier)
  let tdee: number;
  let activityMultiplier: number;
  let neatCalories: number | undefined;
  let exerciseCalories: number | undefined;

  if (profile.advancedActivity && profile.dailySteps !== undefined) {
    // Clamp steps to a plausible range to prevent typos (e.g. 100000) from blowing up NEAT
    const steps = Math.max(0, Math.min(50000, profile.dailySteps));
    // NEAT from steps: ~0.04 kcal per step, scaled by body weight relative to 70kg reference
    const stepsNeat = Math.round(steps * 0.04 * (weightKg / 70));

    // NEAT from occupation
    const occupationNeat = OCCUPATION_NEAT[profile.occupationType ?? 'desk'] ?? 0;

    neatCalories = stepsNeat + occupationNeat;

    // Exercise calories from sessions (template or custom)
    const sessions = resolveExerciseSessions(profile);
    exerciseCalories = calculateExerciseCalories(sessions, weightKg);

    tdee = Math.round(bmr + neatCalories + exerciseCalories);
    // Store a computed multiplier for display/backwards compat
    activityMultiplier = Math.round((tdee / bmr) * 100) / 100;
  } else {
    activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
    tdee = Math.round(bmr * activityMultiplier);
  }

  // Adjust for goal
  const goalMultipliers: Record<UserProfile['goal'], number> = {
    'lose-aggressive': 0.7,
    'lose-moderate': 0.8,
    'lose-mild': 0.9,
    'maintain': 1.0,
    'gain-lean': 1.1,
    'gain-aggressive': 1.2,
  };
  // Apply 1200 kcal safety floor for aggressive-deficit goals on smaller frames
  const targetCalories = Math.max(1200, Math.round(tdee * goalMultipliers[profile.goal]));

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    activityMultiplier,
    neatCalories,
    exerciseCalories,
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

    if (marker === 'creatinine' && profile.chronicKidneyDisease) {
      const interp = getMarkerInterpretation(marker, value, profile.gender);
      const isRisk =
        interp.status === 'borderline' || interp.status === 'high' || interp.status === 'critical';
      if (isRisk) {
        const type = typeFromStatus(interp.status);
        insights.push({
          type,
          title: `${MARKER_NAMES[marker]} — ${interp.label}`,
          description:
            'Creatinine is elevated, consistent with known CKD. Monitor eGFR trend rather than single values.',
        });
        continue;
      }
    }

    const interp = getMarkerInterpretation(marker, value, profile.gender);
    let type = typeFromStatus(interp.status);
    if (
      profile.familyHeartDisease &&
      CV_MARKERS.includes(marker) &&
      isCardiovascularFamilyRiskStatus(marker, interp.status)
    ) {
      if (type === 'warning') type = 'danger';
    }

    let description = getDescription(marker, value, interp.label);
    if (
      profile.familyHeartDisease &&
      CV_MARKERS.includes(marker) &&
      isCardiovascularFamilyRiskStatus(marker, interp.status)
    ) {
      description +=
        ' Family history of premature heart disease increases your personal risk — treat borderline cardiovascular markers more aggressively.';
    }

    insights.push({
      type,
      title: `${MARKER_NAMES[marker]} — ${interp.label}`,
      description,
    });
  }

  if (
    profile.takingStatins &&
    profile.alcoholDrinksPerWeek !== undefined &&
    profile.alcoholDrinksPerWeek > 14 &&
    markers.alt !== undefined &&
    markers.alt > 40
  ) {
    insights.push({
      type: 'warning',
      title: 'Liver enzymes — statins and alcohol',
      description:
        'Both statin therapy and heavier alcohol use can contribute to ALT elevations. Discuss both with your clinician before retesting.',
    });
  }

  // Cross-marker pattern insights — detect systemic patterns, not just individual flags
  insights.push(...generateCrossMarkerInsights(profile, markers));

  if (hasFocusGoal(profile, 'fat-loss') && hasFocusGoal(profile, 'muscle-gain')) {
    insights.push({
      type: 'info',
      title: 'Body Recomposition Mode',
      description:
        'With both fat loss and muscle gain selected, focus on hitting your protein target daily and training stimulus rather than the calorie number. At maintenance or a slight deficit, body recomp is achievable for most people with untapped training potential.',
    });
  }

  if (profile.chronicKidneyDisease) {
    const macrosEst = calculateMacros(tdee.targetCalories, profile.goal, profile, markers);
    const weightKg = lbsToKg(profile.weightLbs);
    if (macrosEst.protein.grams / weightKg > 1.2) {
      insights.push({
        type: 'warning',
        title: 'Protein intake with CKD',
        description:
          'High protein intake (>1.2 g/kg) may accelerate CKD progression — discuss protein targets with your nephrologist.',
      });
    }
  }

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
  const homaIR = computeHOMAIR(markers.glucose, markers.fastingInsulin);
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

  // --- Medication-aware insights ---

  // Statins: contextualize LDL and ALT
  if (profile.takingStatins) {
    if (markers.ldl !== undefined && markers.ldl < 100) {
      insights.push({
        type: 'success',
        title: 'LDL Well-Controlled on Statin Therapy',
        description: `LDL at ${markers.ldl} mg/dL is within target range while on statin therapy.`,
        recommendation: 'Continue current statin regimen. Retest lipid panel annually or as directed by your physician.',
      });
    }
    if (markers.alt !== undefined && markers.alt > 40) {
      insights.push({
        type: 'warning',
        title: 'Elevated ALT — Possible Statin Effect',
        description: `ALT at ${markers.alt} U/L may be related to statin therapy. Mild elevations (<3x upper limit) are common and usually benign.`,
        recommendation: 'Discuss with your prescribing physician. Persistent elevations above 3x normal may warrant dose adjustment or switching statins.',
      });
    }
  }

  // Thyroid medication: contextualize TSH
  if (profile.takingThyroidMeds && markers.tsh !== undefined) {
    const tshInterp = getMarkerInterpretation('tsh', markers.tsh, profile.gender);
    if (tshInterp.status === 'optimal' || tshInterp.status === 'normal') {
      insights.push({
        type: 'success',
        title: 'TSH Well-Managed on Medication',
        description: `TSH at ${markers.tsh} mIU/L is within target range on thyroid medication.`,
        recommendation: 'Continue current thyroid medication. Retest TSH every 6–12 months or if symptoms change.',
      });
    }
  }

  // --- Dietary pattern insights ---

  // Keto + elevated LDL: lean mass hyper-responder context
  if (profile.dietaryPattern === 'keto' && markers.ldl !== undefined && markers.ldl >= 130 && !profile.takingStatins) {
    insights.push({
      type: 'info',
      title: 'Elevated LDL on Ketogenic Diet',
      description: `LDL at ${markers.ldl} mg/dL may reflect a lean mass hyper-responder pattern common on low-carb/keto diets — LDL rises while triglycerides and HDL often improve.`,
      recommendation: 'Request ApoB and Lp(a) testing for a more accurate cardiovascular risk assessment. If ApoB is normal (<90 mg/dL), the elevated LDL is less concerning.',
    });
  }

  // Vegan/vegetarian + low B12/ferritin: expected context
  if (
    (profile.dietaryPattern === 'vegan' || profile.dietaryPattern === 'vegetarian') &&
    markers.vitaminB12 !== undefined && markers.vitaminB12 < 300
  ) {
    insights.push({
      type: 'warning',
      title: `Low B12 — Common on ${profile.dietaryPattern === 'vegan' ? 'Vegan' : 'Vegetarian'} Diet`,
      description: `B12 at ${markers.vitaminB12} pg/mL is below optimal. Plant-based diets provide limited bioavailable B12.`,
      recommendation: 'Supplement with B12 (2000 mcg/day sublingual for vegans, 1000 mcg/day for vegetarians). Retest in 3 months.',
    });
  }

  // --- Lifestyle-aware insights ---

  // Poor sleep + elevated glucose/hsCRP
  if (profile.sleepHoursAvg !== undefined && profile.sleepHoursAvg < 6) {
    const sleepMarkers: string[] = [];
    if (markers.glucose !== undefined && markers.glucose >= 100) sleepMarkers.push('fasting glucose');
    if (markers.hsCRP !== undefined && markers.hsCRP > 2.0) sleepMarkers.push('hs-CRP');
    if (markers.hba1c !== undefined && markers.hba1c >= 5.7) sleepMarkers.push('HbA1c');
    if (sleepMarkers.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Poor Sleep May Be Elevating Markers',
        description: `Averaging ${profile.sleepHoursAvg} hours of sleep may be contributing to elevated ${sleepMarkers.join(' and ')}. Sleep deprivation raises cortisol, increases insulin resistance, and promotes inflammation.`,
        recommendation: 'Prioritize 7–9 hours of sleep before focusing on dietary interventions. Improving sleep alone can lower glucose and inflammatory markers.',
      });
    }
  }

  // Menstrual status + borderline ferritin
  if (
    profile.menstrualStatus === 'regular' &&
    markers.ferritin !== undefined && markers.ferritin >= 12 && markers.ferritin < 30
  ) {
    insights.push({
      type: 'warning',
      title: 'Borderline Ferritin with Menstrual Iron Losses',
      description: `Ferritin at ${markers.ferritin} ng/mL is borderline. Regular menstruation causes ongoing iron losses that will likely deplete stores further.`,
      recommendation: 'Begin iron supplementation (18 mg/day with vitamin C) proactively. Retest ferritin in 3 months. Target >50 ng/mL for optimal energy and exercise performance.',
    });
  }

  // Alcohol + liver enzymes / triglycerides
  const alcohol = profile.alcoholDrinksPerWeek;
  if (alcohol !== undefined && alcohol > 14) {
    const altHigh = markers.alt !== undefined && markers.alt > 45;
    const astHigh = markers.ast !== undefined && markers.ast > 40;
    if (altHigh || astHigh) {
      insights.push({
        type: 'warning',
        title: 'Alcohol and liver enzymes',
        description:
          'Heavy alcohol use is a likely contributor to elevated liver enzymes. Consider reducing intake before retesting.',
      });
    }
  }
  if (alcohol !== undefined && alcohol > 21 && markers.triglycerides !== undefined) {
    const tgInterp = getMarkerInterpretation('triglycerides', markers.triglycerides, profile.gender);
    if (tgInterp.status === 'borderline' || tgInterp.status === 'high' || tgInterp.status === 'critical') {
      insights.push({
        type: 'warning',
        title: 'Alcohol and triglycerides',
        description:
          'Heavy alcohol intake can raise triglycerides — reducing alcohol often helps before other interventions.',
      });
    }
  }

  // HRT (female)
  if (profile.takingHRT && profile.gender === 'female') {
    if (markers.ldl !== undefined) {
      const ldlInterp = getMarkerInterpretation('ldl', markers.ldl, profile.gender);
      if (ldlInterp.status === 'normal' || ldlInterp.status === 'optimal') {
        insights.push({
          type: 'info',
          title: 'LDL and HRT',
          description:
            'HRT may lower LDL — this is expected and not necessarily a sign of poor metabolic health.',
        });
      }
    }
    if (markers.triglycerides !== undefined) {
      const tgInterp = getMarkerInterpretation('triglycerides', markers.triglycerides, profile.gender);
      if (tgInterp.status === 'borderline' || tgInterp.status === 'high' || tgInterp.status === 'critical') {
        insights.push({
          type: 'info',
          title: 'Triglycerides and HRT',
          description:
            'Oral estrogen can raise triglycerides — transdermal HRT has less effect on lipids.',
        });
      }
    }
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
  profile?: Pick<UserProfile, 'weightLbs' | 'gender' | 'focusGoal' | 'dietaryPattern'>,
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
    const homaIR = computeHOMAIR(markers.glucose, markers.fastingInsulin);
    if (homaIR !== null && homaIR > 2.0) {
      carbFraction -= 0.10; // shift 10% from carbs to fat for IR
    }
    if (markers.triglycerides !== undefined && markers.triglycerides > 150) {
      carbFraction -= 0.05; // further reduce carbs for high TG
    }
    // Floor: don't go below 30% of remaining as carbs
    carbFraction = Math.max(0.30, carbFraction);
  }

  const fg = profile ? focusGoalList(profile) : [];
  const recompMode =
    Boolean(profile && hasFocusGoal(profile, 'fat-loss') && hasFocusGoal(profile, 'muscle-gain'));

  // Focus goals: max protein per lb across selections; average carb deltas
  if (fg.length > 0) {
    for (const goal of fg) {
      proteinGrams = Math.round(Math.max(proteinGrams, weightLbs * FOCUS_PROTEIN_PER_LB[goal]));
    }
    proteinGrams = Math.min(proteinGrams, Math.round(calories * 0.45 / 4));

    const avgCarbDelta = fg.reduce((sum, g) => sum + FOCUS_CARB_DELTA[g], 0) / fg.length;
    carbFraction += avgCarbDelta;
    carbFraction = Math.max(0.20, Math.min(0.75, carbFraction));
  }

  // Dietary pattern carb caps
  if (profile?.dietaryPattern === 'keto') {
    carbFraction = Math.min(carbFraction, 0.20);
  } else if (profile?.dietaryPattern === 'low-carb') {
    carbFraction = Math.min(carbFraction, 0.30);
  }

  // Recalculate protein calories after possible focus goal changes
  const proteinCal2 = proteinGrams * 4;
  const remaining2 = calories - proteinCal2;

  const carbGrams = Math.round((remaining2 * carbFraction) / 4);
  const fatGrams = Math.max(0, Math.round((remaining2 - carbGrams * 4) / 9));

  // Compute actual percentages
  const pctP = Math.round((proteinCal2 / calories) * 100);
  const pctC = Math.round((carbGrams * 4 / calories) * 100);
  const pctF = 100 - pctP - pctC;

  return {
    protein: { grams: proteinGrams, pct: pctP },
    carbs: { grams: carbGrams, pct: pctC },
    fat: { grams: fatGrams, pct: pctF },
    calories,
    recompMode: recompMode || undefined,
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

  // Water: ~0.5 oz per lb bodyweight + activity add-on
  const activityIdx = ACTIVITY_TIERS.indexOf(profile.activityLevel);
  let waterIntakeOz: number;
  if (profile.advancedActivity && profile.dailySteps !== undefined) {
    // Scale by steps: base + 8oz per 2000 steps
    waterIntakeOz = Math.round(profile.weightLbs * 0.5 + (profile.dailySteps / 2000) * 8);
  } else {
    waterIntakeOz = Math.round(profile.weightLbs * 0.5 + activityIdx * 16);
  }

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
  const rawHOMAIR = computeHOMAIR(markers.glucose, markers.fastingInsulin);
  if (rawHOMAIR !== null && markers.glucose! > 0 && markers.fastingInsulin! > 0) {
    homaIR = Math.round(rawHOMAIR * 10) / 10;
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
  const supplements: SupplementRec[] = [];

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
  const homaIRVal = computeHOMAIR(markers.glucose, markers.fastingInsulin);
  if (
    (homaIRVal !== null && homaIRVal > 1.5) ||
    (markers.glucose !== undefined && markers.glucose >= 100) ||
    (markers.hba1c !== undefined && markers.hba1c >= 5.7)
  ) {
    supplements.push({ name: 'Magnesium Glycinate', dosage: '300–400 mg daily', reason: 'Supports insulin sensitivity, metabolic health, and muscle recovery — often depleted in insulin-resistant states' });
  }

  // Creatine — for gain goals, muscle-gain focus, or active individuals
  if (
    profile.goal.startsWith('gain') ||
    hasFocusGoal(profile, 'muscle-gain') ||
    profile.activityLevel === 'active' ||
    profile.activityLevel === 'very-active'
  ) {
    supplements.push({ name: 'Creatine Monohydrate', dosage: '3–5 g daily', reason: 'Supports strength, power output, and lean mass — most studied sports supplement (ISSN position stand)' });
  }

  // --- Lifestyle-driven supplements ---

  // Dietary pattern: vegan → B12 + algal DHA; vegetarian → B12 if not already flagged
  if (profile.dietaryPattern === 'vegan') {
    if (!supplements.some(s => s.name === 'Vitamin B12')) {
      supplements.push({ name: 'Vitamin B12', dosage: '2000 mcg daily (sublingual or spray)', reason: 'Essential for vegans — B12 is not available from plant sources' });
    }
    supplements.push({ name: 'Algal Omega-3 (DHA)', dosage: '250–500 mg DHA daily', reason: 'Plant-based DHA source — vegans have no dietary DHA intake' });
  } else if (profile.dietaryPattern === 'vegetarian' && !supplements.some(s => s.name === 'Vitamin B12')) {
    supplements.push({ name: 'Vitamin B12', dosage: '1000 mcg daily', reason: 'Vegetarians are at risk of B12 insufficiency — limited bioavailable dietary sources' });
  }

  // Sleep: poor sleep → magnesium + melatonin
  if (profile.sleepHoursAvg !== undefined && profile.sleepHoursAvg < 6) {
    if (!supplements.some(s => s.name === 'Magnesium Glycinate')) {
      supplements.push({ name: 'Magnesium Glycinate', dosage: '400 mg before bed', reason: 'Supports sleep quality and relaxation — especially important with short sleep duration' });
    }
    supplements.push({ name: 'Melatonin', dosage: '0.5–1 mg 30 min before bed', reason: 'Low-dose melatonin supports circadian rhythm when sleep is consistently under 6 hours' });
  }

  // Stress: high/very-high → ashwagandha + magnesium
  if (profile.stressLevel === 'high' || profile.stressLevel === 'very-high') {
    supplements.push({ name: 'Ashwagandha (KSM-66)', dosage: '600 mg daily', reason: 'Clinically shown to reduce cortisol and perceived stress (Chandrasekhar et al., 2012)' });
    if (!supplements.some(s => s.name === 'Magnesium Glycinate')) {
      supplements.push({ name: 'Magnesium Glycinate', dosage: '300–400 mg daily', reason: 'Supports stress resilience and nervous system function — often depleted under chronic stress' });
    }
  }

  // Menstrual status: regular cycle + borderline ferritin → heighten iron urgency
  if (
    profile.menstrualStatus === 'regular' &&
    markers.ferritin !== undefined && markers.ferritin < 30 && markers.ferritin >= 12 &&
    !ironDeficient
  ) {
    const inflamed = markers.hsCRP !== undefined && markers.hsCRP > 3.0;
    if (!inflamed) {
      supplements.push({ name: 'Iron', dosage: '18 mg daily (with vitamin C)', reason: 'Ferritin is borderline and monthly menstrual losses increase depletion risk — supplement proactively' });
    }
  }

  // Focus goal: endurance → electrolytes; longevity → omega-3 if not already added
  if (hasFocusGoal(profile, 'endurance')) {
    supplements.push({
      name: 'Electrolyte Mix',
      dosage: 'During and after training sessions',
      reason: 'Endurance training increases sodium, potassium, and magnesium losses through sweat',
      ...(profile.chronicKidneyDisease
        ? { warning: 'CKD: discuss electrolyte and potassium intake with your nephrologist — some mixes are high in potassium.' }
        : {}),
    });
  }
  if (hasFocusGoal(profile, 'longevity') && !supplements.some((s) => s.name.includes('Omega-3'))) {
    supplements.push({ name: 'Omega-3 (EPA/DHA)', dosage: '1–2 g EPA+DHA daily', reason: 'Supports cardiovascular health, cognitive function, and healthy aging' });
  }

  if (profile.alcoholDrinksPerWeek !== undefined && profile.alcoholDrinksPerWeek > 14) {
    if (!supplements.some((s) => s.name.includes('B-Complex'))) {
      supplements.push({
        name: 'B-Complex (B1, B6, B12)',
        dosage: 'Per label (standard daily)',
        reason: 'Heavy alcohol use depletes B vitamins, particularly thiamine (B1)',
      });
    }
  }

  if (
    profile.familyHeartDisease &&
    !supplements.some((s) => s.name.includes('Omega-3'))
  ) {
    supplements.push({
      name: 'Omega-3 (EPA/DHA)',
      dosage: '2–3 g EPA+DHA daily',
      reason: 'Family history of premature heart disease — omega-3s support cardiovascular health',
    });
  }

  if (profile.chronicKidneyDisease) {
    for (let i = 0; i < supplements.length; i++) {
      if (supplements[i].name.includes('Magnesium')) {
        supplements[i] = {
          ...supplements[i],
          warning:
            supplements[i].warning ??
            'CKD: avoid high-dose magnesium supplements without clearance from your physician.',
        };
      }
    }
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

  const pushUniqueExercise = (line: string) => {
    if (!exerciseSuggestions.includes(line)) exerciseSuggestions.push(line);
  };

  if (profile.familyHeartDisease) {
    pushUniqueExercise(
      'Prioritize cardiorespiratory fitness (VO2max) — it is the most modifiable cardiovascular risk factor.',
    );
  }

  const FOCUS_EXERCISE_ORDER: FocusGoal[] = [
    'metabolic-health',
    'endurance',
    'muscle-gain',
    'fat-loss',
    'longevity',
    'general-wellness',
  ];
  for (const g of FOCUS_EXERCISE_ORDER) {
    if (!hasFocusGoal(profile, g)) continue;
    switch (g) {
      case 'endurance':
        pushUniqueExercise(
          'Build a zone 2 cardio base (60–70% max HR) for 80% of cardio volume — this builds aerobic capacity with minimal fatigue.',
        );
        pushUniqueExercise(
          'Include 1–2 interval sessions per week to improve VO2max and lactate threshold.',
        );
        break;
      case 'muscle-gain':
        pushUniqueExercise(
          'Prioritize 3–4 strength sessions per week, hitting each major muscle group 2x with progressive overload.',
        );
        pushUniqueExercise('Limit cardio to 2–3 short sessions (20 min) to preserve recovery capacity for hypertrophy.');
        break;
      case 'fat-loss':
        pushUniqueExercise(
          'Combine strength training (3x/week) with daily step targets (8000+) — NEAT is the biggest lever for fat loss.',
        );
        pushUniqueExercise('Add 1–2 HIIT sessions per week (20 min) to boost metabolic rate and preserve lean mass.');
        break;
      case 'metabolic-health':
        pushUniqueExercise(
          'Take 15-minute walks after each meal — post-meal movement is the most effective way to blunt glucose spikes.',
        );
        pushUniqueExercise(
          'Aim for 3x strength training per week — muscle mass is the largest insulin-sensitive tissue in the body.',
        );
        break;
      case 'longevity':
        pushUniqueExercise(
          'Build VO2max with 1–2 high-intensity sessions per week — VO2max is the strongest predictor of all-cause mortality.',
        );
        pushUniqueExercise(
          'Include zone 2 cardio (3+ hours/week), strength training (2–3x/week), and daily mobility work.',
        );
        break;
      default:
        break;
    }
  }

  if (
    profile.alcoholDrinksPerWeek !== undefined &&
    profile.alcoholDrinksPerWeek > 7 &&
    markers.uricAcid !== undefined &&
    markers.uricAcid > 7.0
  ) {
    pushUniqueExercise(
      'Stay well hydrated during exercise — alcohol and elevated uric acid both raise dehydration and gout flare risk.',
    );
  }

  // Exercise gap detection from advanced activity sessions
  if (profile.advancedActivity) {
    const sessions = resolveExerciseSessions(profile);
    const hasStrength = sessions.some(s => s.type === 'strength');
    const hasCardio = sessions.some(s => ['cardio-low', 'cardio-moderate', 'cardio-high'].includes(s.type));
    const allHighIntensity = sessions.length > 0 && sessions.every(s => ['cardio-high', 'strength', 'sports'].includes(s.type));

    if (!hasStrength && sessions.length > 0) {
      exerciseSuggestions.push('Your current routine has no strength training — adding 2–3 sessions per week supports metabolic health, bone density, and injury prevention.');
    }
    if (!hasCardio && sessions.length > 0) {
      exerciseSuggestions.push('Your current routine has no dedicated cardio — adding 2–3 sessions per week (even brisk walking) supports cardiovascular health and recovery.');
    }
    if (allHighIntensity && sessions.length >= 5) {
      exerciseSuggestions.push('Your routine is all high-intensity — consider replacing 1–2 sessions with low-intensity recovery work (yoga, walking, swimming) to prevent overtraining.');
    }
  }

  // Lifestyle-driven exercise adjustments
  if (profile.sleepHoursAvg !== undefined && profile.sleepHoursAvg < 6) {
    exerciseSuggestions.push('Sleep under 6 hours impairs recovery and increases injury risk — reduce training intensity until sleep improves, and prioritize sleep hygiene.');
  }
  if (profile.stressLevel === 'high' || profile.stressLevel === 'very-high') {
    exerciseSuggestions.push('High stress elevates cortisol — add dedicated stress-reduction activities (yoga, tai chi, nature walks) and limit high-intensity sessions to 2–3 per week.');
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
  const mealTiming = calculateMealTiming(tdeeResult.targetCalories, profile.goal, focusGoalList(profile));

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
  focusGoals: FocusGoal[],
): MealTimingSuggestion[] {
  const fg = focusGoals;

  // Priority: metabolic-health > endurance > muscle-gain > default goal-based
  if (fg.includes('metabolic-health')) {
    return [
      { meal: 'Meal 1', time: '12:00–1:00 PM', calories: Math.round(targetCalories * 0.35), focus: 'Break fast with protein + healthy fats — time-restricted eating (16:8) improves insulin sensitivity' },
      { meal: 'Meal 2', time: '3:30–4:30 PM', calories: Math.round(targetCalories * 0.30), focus: 'Balanced meal with fiber-rich carbs and lean protein' },
      { meal: 'Meal 3', time: '7:00–8:00 PM', calories: Math.round(targetCalories * 0.35), focus: 'Last meal before 8 PM — emphasize protein and vegetables' },
    ];
  }

  if (fg.includes('endurance')) {
    return [
      { meal: 'Breakfast', time: '7:00–8:00 AM', calories: Math.round(targetCalories * 0.25), focus: 'Carb-focused for glycogen loading' },
      { meal: 'Pre-Workout', time: '10:30–11:00 AM', calories: Math.round(targetCalories * 0.15), focus: 'Easily digestible carbs (banana, toast, energy bar)' },
      { meal: 'Post-Workout', time: '1:00–2:00 PM', calories: Math.round(targetCalories * 0.25), focus: 'Carbs + protein (3:1 ratio) within 30 min of training for glycogen replenishment' },
      { meal: 'Dinner', time: '6:30–7:30 PM', calories: Math.round(targetCalories * 0.35), focus: 'Balanced meal — replenish micronutrients and protein' },
    ];
  }

  if (fg.includes('muscle-gain')) {
    return [
      { meal: 'Breakfast', time: '7:00–8:00 AM', calories: Math.round(targetCalories * 0.25), focus: '30–40g protein + carbs — break overnight catabolic state' },
      { meal: 'Lunch', time: '11:30 AM–12:30 PM', calories: Math.round(targetCalories * 0.25), focus: '30–40g protein + complex carbs for sustained energy' },
      { meal: 'Post-Workout', time: '3:00–4:00 PM', calories: Math.round(targetCalories * 0.25), focus: '30–40g fast protein + simple carbs — maximize muscle protein synthesis window' },
      { meal: 'Dinner', time: '7:00–8:00 PM', calories: Math.round(targetCalories * 0.25), focus: '30–40g protein + healthy fats — casein-rich foods (cottage cheese, Greek yogurt) before bed' },
    ];
  }

  // Default: use caloric goal patterns
  if (goal.startsWith('lose')) {
    return [
      { meal: 'Breakfast', time: '7:00–8:00 AM', calories: Math.round(targetCalories * 0.35), focus: 'Protein + fiber to sustain satiety' },
      { meal: 'Lunch', time: '12:00–1:00 PM', calories: Math.round(targetCalories * 0.35), focus: 'Lean protein + complex carbs' },
      { meal: 'Snack', time: '3:00–4:00 PM', calories: Math.round(targetCalories * 0.10), focus: 'Protein-rich (Greek yogurt, nuts)' },
      { meal: 'Dinner', time: '6:00–7:00 PM', calories: Math.round(targetCalories * 0.20), focus: 'Light protein + vegetables, limit carbs' },
    ];
  }

  if (goal.startsWith('gain')) {
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
