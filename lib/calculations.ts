import { UserProfile, ActivityLevel, TDEEResult, BloodMarkers, HealthScore, Insight } from '@/types';

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
  
  console.log('TDEE Calculation Debug:', { weightLbs: profile.weightLbs, weightKg, heightCm, age: profile.age, gender: profile.gender });
  
  // Mifflin-St Jeor Equation
  let bmr: number;
  
  if (profile.gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age - 161;
  }
  
  console.log('Calculated BMR:', bmr);

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
