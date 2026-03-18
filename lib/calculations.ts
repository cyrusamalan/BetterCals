import { UserProfile, ActivityLevel, TDEEResult, BloodMarkers, HealthScore, Insight, CalorieTier, MacroBreakdown, PersonalizedRecs } from '@/types';

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
  // Validate input ranges to catch errors early
  if (profile.weightLbs < 40 || profile.weightLbs > 700) {
    console.error(`⚠️ Invalid weight detected: ${profile.weightLbs} lbs. Expected 40-700 lbs.`);
  }
  if (profile.age < 13 || profile.age > 120) {
    console.error(`⚠️ Invalid age detected: ${profile.age}. Expected 13-120 years.`);
  }
  
  // Convert imperial to metric for calculation
  const weightKg = lbsToKg(profile.weightLbs);
  const heightCm = feetInchesToCm(profile.heightFeet, profile.heightInches);
  
  // Mifflin-St Jeor Equation
  let bmr: number;
  
  if (profile.gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age - 161;
  }

  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const tdee = Math.round(bmr * activityMultiplier);

  // Adjust for goal
  let targetCalories = tdee;
  if (profile.goal === 'lose') {
    targetCalories = Math.round(tdee * 0.8); // 20% deficit
  } else if (profile.goal === 'gain') {
    targetCalories = Math.round(tdee * 1.1); // 10% surplus
  }

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    activityMultiplier,
  };
}

export function calculateHealthScore(markers: BloodMarkers): HealthScore {
  const scores = {
    metabolic: calculateMetabolicScore(markers),
    cardiovascular: calculateCardiovascularScore(markers),
    hormonal: calculateHormonalScore(markers),
    nutritional: calculateNutritionalScore(markers),
  };

  const overall = Math.round(
    (scores.metabolic + scores.cardiovascular + scores.hormonal + scores.nutritional) / 4
  );

  return {
    overall,
    ...scores,
  };
}

function calculateMetabolicScore(markers: BloodMarkers): number {
  let score = 70; // baseline
  
  if (markers.glucose !== undefined) {
    if (markers.glucose < 100) score += 15;
    else if (markers.glucose < 126) score += 5;
    else score -= 20;
  }

  if (markers.hba1c !== undefined) {
    if (markers.hba1c < 5.7) score += 15;
    else if (markers.hba1c < 6.5) score += 5;
    else score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateCardiovascularScore(markers: BloodMarkers): number {
  let score = 70;

  if (markers.ldl !== undefined) {
    if (markers.ldl < 100) score += 10;
    else if (markers.ldl < 130) score += 5;
    else if (markers.ldl < 160) score -= 10;
    else score -= 20;
  }

  if (markers.hdl !== undefined) {
    if (markers.hdl > 60) score += 15;
    else if (markers.hdl > 40) score += 5;
    else score -= 10;
  }

  if (markers.triglycerides !== undefined) {
    if (markers.triglycerides < 150) score += 10;
    else if (markers.triglycerides < 200) score += 0;
    else score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateHormonalScore(markers: BloodMarkers): number {
  let score = 75;

  if (markers.tsh !== undefined) {
    if (markers.tsh >= 0.5 && markers.tsh <= 4.0) score += 10;
    else if (markers.tsh >= 0.3 && markers.tsh <= 5.0) score += 0;
    else score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateNutritionalScore(markers: BloodMarkers): number {
  let score = 70;
  let deficiencies = 0;

  if (markers.vitaminD !== undefined && markers.vitaminD < 30) deficiencies++;
  if (markers.vitaminB12 !== undefined && markers.vitaminB12 < 300) deficiencies++;
  if (markers.ferritin !== undefined && markers.ferritin < 30) deficiencies++;
  if (markers.iron !== undefined && markers.iron < 60) deficiencies++;

  score -= deficiencies * 10;
  
  return Math.max(0, Math.min(100, score));
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

  // Blood marker insights
  if (markers.glucose !== undefined) {
    if (markers.glucose >= 126) {
      insights.push({
        type: 'danger',
        title: 'Elevated Fasting Glucose',
        description: `Your fasting glucose of ${markers.glucose} mg/dL is in the diabetic range.`,
        recommendation: 'Consult a healthcare provider. Consider reducing refined carbs and increasing fiber intake.',
      });
    } else if (markers.glucose >= 100) {
      insights.push({
        type: 'warning',
        title: 'Pre-diabetic Glucose Levels',
        description: `Your fasting glucose of ${markers.glucose} mg/dL indicates pre-diabetes.`,
        recommendation: 'Focus on low-glycemic foods, regular exercise, and weight management.',
      });
    }
  }

  if (markers.hba1c !== undefined) {
    if (markers.hba1c >= 6.5) {
      insights.push({
        type: 'danger',
        title: 'Diabetic HbA1c Level',
        description: `Your HbA1c of ${markers.hba1c}% indicates diabetes.`,
        recommendation: 'Work with your doctor on a management plan. Consider a low-carb or Mediterranean diet.',
      });
    }
  }

  if (markers.vitaminD !== undefined && markers.vitaminD < 30) {
    insights.push({
      type: 'warning',
      title: 'Low Vitamin D',
      description: `Your Vitamin D level of ${markers.vitaminD} ng/mL is below optimal.`,
      recommendation: 'Consider supplementation (2000-4000 IU daily) and increase sun exposure.',
    });
  }

  if (markers.hdl !== undefined && markers.hdl < 40) {
    insights.push({
      type: 'warning',
      title: 'Low HDL Cholesterol',
      description: `Your HDL of ${markers.hdl} mg/dL is below ideal levels.`,
      recommendation: 'Increase healthy fats (olive oil, fatty fish), exercise regularly, and consider reducing refined carbs.',
    });
  }

  // LDL high
  if (markers.ldl !== undefined && markers.ldl >= 130) {
    insights.push({
      type: markers.ldl >= 160 ? 'danger' : 'warning',
      title: 'Elevated LDL Cholesterol',
      description: `Your LDL of ${markers.ldl} mg/dL is above optimal levels (< 100 mg/dL).`,
      recommendation: 'Reduce saturated fats, increase soluble fiber, and consider plant sterols. Discuss statin therapy with your doctor if levels persist.',
    });
  }

  // Triglycerides high
  if (markers.triglycerides !== undefined && markers.triglycerides >= 150) {
    insights.push({
      type: markers.triglycerides >= 200 ? 'danger' : 'warning',
      title: 'High Triglycerides',
      description: `Your triglycerides at ${markers.triglycerides} mg/dL exceed the optimal range (< 150 mg/dL).`,
      recommendation: 'Limit sugar and refined carbs, increase omega-3 fatty acids, and maintain regular physical activity.',
    });
  }

  // Total cholesterol high
  if (markers.totalCholesterol !== undefined && markers.totalCholesterol >= 200) {
    insights.push({
      type: markers.totalCholesterol >= 240 ? 'danger' : 'warning',
      title: 'Elevated Total Cholesterol',
      description: `Your total cholesterol of ${markers.totalCholesterol} mg/dL is above the desirable range (< 200 mg/dL).`,
      recommendation: 'Focus on a heart-healthy diet rich in fruits, vegetables, whole grains, and lean proteins.',
    });
  }

  // B12 low
  if (markers.vitaminB12 !== undefined && markers.vitaminB12 < 300) {
    insights.push({
      type: 'warning',
      title: 'Low Vitamin B12',
      description: `Your B12 level of ${markers.vitaminB12} pg/mL is below the recommended range.`,
      recommendation: 'Consider B12 supplementation (1000 mcg daily). Include more animal products, fortified cereals, or nutritional yeast.',
    });
  }

  // Ferritin low
  if (markers.ferritin !== undefined && markers.ferritin < 30) {
    insights.push({
      type: 'warning',
      title: 'Low Ferritin (Iron Stores)',
      description: `Your ferritin of ${markers.ferritin} ng/mL indicates depleted iron reserves.`,
      recommendation: 'Increase iron-rich foods (red meat, lentils, spinach). Pair with vitamin C for better absorption. Avoid tea/coffee with meals.',
    });
  }

  // Iron low
  if (markers.iron !== undefined && markers.iron < 60) {
    insights.push({
      type: 'warning',
      title: 'Low Serum Iron',
      description: `Your serum iron of ${markers.iron} mcg/dL is below the normal range.`,
      recommendation: 'Consider iron supplementation with vitamin C. Include iron-rich foods and cook in cast iron when possible.',
    });
  }

  // TSH abnormal
  if (markers.tsh !== undefined) {
    if (markers.tsh > 4.0) {
      insights.push({
        type: 'warning',
        title: 'Elevated TSH',
        description: `Your TSH of ${markers.tsh} mIU/L suggests possible hypothyroidism.`,
        recommendation: 'Consult an endocrinologist. Symptoms may include fatigue, weight gain, and cold sensitivity.',
      });
    } else if (markers.tsh < 0.5) {
      insights.push({
        type: 'warning',
        title: 'Low TSH',
        description: `Your TSH of ${markers.tsh} mIU/L suggests possible hyperthyroidism.`,
        recommendation: 'Consult an endocrinologist. Symptoms may include rapid heartbeat, weight loss, and anxiety.',
      });
    }
  }

  // Positive/success insights for optimal ranges
  if (markers.glucose !== undefined && markers.glucose < 100) {
    insights.push({
      type: 'success',
      title: 'Healthy Fasting Glucose',
      description: `Your fasting glucose of ${markers.glucose} mg/dL is in the normal range.`,
    });
  }

  if (markers.hdl !== undefined && markers.hdl >= 60) {
    insights.push({
      type: 'success',
      title: 'Excellent HDL Cholesterol',
      description: `Your HDL of ${markers.hdl} mg/dL provides strong cardiovascular protection.`,
    });
  }

  if (markers.ldl !== undefined && markers.ldl < 100) {
    insights.push({
      type: 'success',
      title: 'Optimal LDL Cholesterol',
      description: `Your LDL of ${markers.ldl} mg/dL is in the optimal range.`,
    });
  }

  if (markers.vitaminD !== undefined && markers.vitaminD >= 30) {
    insights.push({
      type: 'success',
      title: 'Adequate Vitamin D',
      description: `Your vitamin D level of ${markers.vitaminD} ng/mL is within the healthy range.`,
    });
  }

  if (markers.tsh !== undefined && markers.tsh >= 0.5 && markers.tsh <= 4.0) {
    insights.push({
      type: 'success',
      title: 'Normal Thyroid Function',
      description: `Your TSH of ${markers.tsh} mIU/L indicates healthy thyroid function.`,
    });
  }

  return insights;
}

export function identifyDeficiencies(markers: BloodMarkers): string[] {
  const deficiencies: string[] = [];

  if (markers.vitaminD !== undefined && markers.vitaminD < 30) {
    deficiencies.push('Vitamin D');
  }
  if (markers.vitaminB12 !== undefined && markers.vitaminB12 < 300) {
    deficiencies.push('Vitamin B12');
  }
  if (markers.ferritin !== undefined && markers.ferritin < 30) {
    deficiencies.push('Iron (Ferritin)');
  }
  if (markers.iron !== undefined && markers.iron < 60) {
    deficiencies.push('Serum Iron');
  }

  return deficiencies;
}

export function identifyRisks(markers: BloodMarkers): string[] {
  const risks: string[] = [];

  if (markers.glucose !== undefined && markers.glucose >= 100) {
    risks.push('Impaired glucose regulation');
  }
  if (markers.hba1c !== undefined && markers.hba1c >= 5.7) {
    risks.push('Metabolic syndrome risk');
  }
  if (markers.ldl !== undefined && markers.ldl >= 130) {
    risks.push('Cardiovascular disease risk');
  }
  if (markers.triglycerides !== undefined && markers.triglycerides >= 150) {
    risks.push('Dyslipidemia');
  }

  return risks;
}

export function calculateCalorieTiers(tdee: number): CalorieTier[] {
  return [
    { label: 'Lose 1.5 lb/wk', weeklyChange: '-1.5 lb', dailyCalories: Math.max(1200, Math.round(tdee - 750)), dailyDeficit: -750 },
    { label: 'Lose 1 lb/wk', weeklyChange: '-1 lb', dailyCalories: Math.max(1200, Math.round(tdee - 500)), dailyDeficit: -500 },
    { label: 'Lose 0.5 lb/wk', weeklyChange: '-0.5 lb', dailyCalories: Math.max(1200, Math.round(tdee - 250)), dailyDeficit: -250 },
    { label: 'Maintain', weeklyChange: '0 lb', dailyCalories: Math.round(tdee), dailyDeficit: 0 },
    { label: 'Gain 0.5 lb/wk', weeklyChange: '+0.5 lb', dailyCalories: Math.round(tdee + 250), dailyDeficit: 250 },
    { label: 'Gain 1 lb/wk', weeklyChange: '+1 lb', dailyCalories: Math.round(tdee + 500), dailyDeficit: 500 },
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
  const fatGrams = Math.round((calories * ratios.f / 100) / 9);

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

export function calculateRecommendations(
  profile: UserProfile,
  markers: BloodMarkers,
  deficiencies: string[]
): PersonalizedRecs {
  const { bmi, category: bmiCategory } = calculateBMI(profile.weightLbs, profile.heightFeet, profile.heightInches);

  // Water: 0.5 oz per lb + 16 oz per activity tier above sedentary
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

  // Supplements from deficiencies
  const supplementMap: Record<string, { dosage: string; reason: string }> = {
    'Vitamin D': { dosage: '2000-4000 IU daily', reason: 'Low vitamin D levels' },
    'Vitamin B12': { dosage: '1000 mcg daily', reason: 'B12 deficiency detected' },
    'Iron (Ferritin)': { dosage: '18-27 mg daily (with vitamin C)', reason: 'Low ferritin stores' },
    'Serum Iron': { dosage: '18-27 mg daily (with vitamin C)', reason: 'Low serum iron levels' },
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

  return { bmi, bmiCategory, waterIntakeOz, ldlHdlRatio, ldlHdlInterpretation, supplements, exerciseSuggestions };
}
