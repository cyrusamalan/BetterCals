import { z } from 'zod';

// ── Blood Markers ──────────────────────────────────────────────────────────
export const bloodMarkersSchema = z.object({
  glucose: z.number().min(20).max(600).optional(),
  hba1c: z.number().min(3).max(20).optional(),
  totalCholesterol: z.number().min(50).max(500).optional(),
  nonHdl: z.number().min(20).max(400).optional(),
  ldl: z.number().min(10).max(400).optional(),
  hdl: z.number().min(5).max(150).optional(),
  triglycerides: z.number().min(20).max(2000).optional(),
  apoB: z.number().min(10).max(300).optional(),
  hsCRP: z.number().min(0.01).max(50).optional(),
  tsh: z.number().min(0.01).max(100).optional(),
  vitaminD: z.number().min(3).max(200).optional(),
  vitaminB12: z.number().min(50).max(5000).optional(),
  ferritin: z.number().min(1).max(3000).optional(),
  iron: z.number().min(5).max(500).optional(),
  alt: z.number().min(1).max(1000).optional(),
  ast: z.number().min(1).max(1000).optional(),
  albumin: z.number().min(1).max(7).optional(),
  creatinine: z.number().min(0.1).max(20).optional(),
  uricAcid: z.number().min(0.5).max(20).optional(),
  fastingInsulin: z.number().min(0.5).max(300).optional(),
}).strict();

// ── User Profile ───────────────────────────────────────────────────────────
export const userProfileSchema = z.object({
  age: z.number().int().min(13).max(120),
  gender: z.enum(['male', 'female']),
  race: z.enum(['white', 'black', 'other']).optional(),
  weightLbs: z.number().min(40).max(700),
  heightFeet: z.number().int().min(3).max(8),
  heightInches: z.number().min(0).max(11.99),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very-active']),
  goal: z.enum(['lose-aggressive', 'lose-moderate', 'lose-mild', 'maintain', 'gain-lean', 'gain-aggressive']),
  smoker: z.boolean().optional(),
  diabetic: z.boolean().optional(),
  bloodPressureSystolic: z.number().min(60).max(300).optional(),
  treatedForHypertension: z.boolean().optional(),
  alcoholDrinksPerWeek: z.number().min(0).max(100).optional(),
  familyHeartDisease: z.boolean().optional(),
  takingHRT: z.boolean().optional(),
  chronicKidneyDisease: z.boolean().optional(),
  waistInches: z.number().min(15).max(80).optional(),
  hipInches: z.number().min(20).max(90).optional(),
  bodyFatPercentage: z.number().min(2).max(60).optional(),
  advancedActivity: z.boolean().optional(),
  dailySteps: z.number().int().min(0).max(100000).optional(),
  occupationType: z.enum(['desk', 'standing', 'light-labor', 'heavy-labor']).optional(),
  exerciseTemplate: z.enum(['strength-focused', 'cardio-focused', 'balanced', 'light-recovery', 'athlete', 'custom']).optional(),
  exerciseSessions: z.array(z.object({
    type: z.enum(['strength', 'cardio-low', 'cardio-moderate', 'cardio-high', 'sports', 'flexibility']),
    durationMinutes: z.number().min(5).max(300),
    frequencyPerWeek: z.number().int().min(1).max(14),
  })).optional(),
  focusGoal: z.array(z.enum(['fat-loss', 'muscle-gain', 'metabolic-health', 'endurance', 'longevity', 'general-wellness'])).optional(),
  sleepHoursAvg: z.number().min(2).max(16).optional(),
  stressLevel: z.enum(['low', 'moderate', 'high', 'very-high']).optional(),
  dietaryPattern: z.enum(['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'low-carb']).optional(),
  menstrualStatus: z.enum(['regular', 'irregular', 'postmenopausal', 'not-applicable']).optional(),
  takingStatins: z.boolean().optional(),
  takingThyroidMeds: z.boolean().optional(),
});

// ── API Request Schemas ────────────────────────────────────────────────────

/** POST /api/analyses — save a new analysis */
export const saveAnalysisSchema = z.object({
  profile: userProfileSchema,
  markers: bloodMarkersSchema,
  result: z.object({
    tdee: z.object({
      bmr: z.number(),
      tdee: z.number(),
      targetCalories: z.number(),
      activityMultiplier: z.number(),
      neatCalories: z.number().optional(),
      exerciseCalories: z.number().optional(),
    }),
    healthScore: z.object({
      overall: z.number(),
      metabolic: z.number(),
      cardiovascular: z.number(),
      hormonal: z.number(),
      nutritional: z.number(),
      hepatic: z.number(),
      renal: z.number(),
    }),
    insights: z.array(z.object({
      type: z.enum(['info', 'warning', 'success', 'danger']),
      title: z.string(),
      description: z.string(),
      recommendation: z.string().optional(),
    })),
    deficiencies: z.array(z.string()),
    risks: z.array(z.string()),
    calorieTiers: z.array(z.object({
      label: z.string(),
      weeklyChange: z.string(),
      dailyCalories: z.number(),
      dailyChange: z.number(),
    })),
    macros: z.object({
      protein: z.object({ grams: z.number(), pct: z.number() }),
      carbs: z.object({ grams: z.number(), pct: z.number() }),
      fat: z.object({ grams: z.number(), pct: z.number() }),
      calories: z.number(),
      recompMode: z.boolean().optional(),
    }),
    recommendations: z.object({}).passthrough(),
    derivedMarkers: z.object({
      ldl: z.number().optional(),
      nonHdl: z.number().optional(),
    }).optional(),
    ascvdRiskScore: z.number().optional(),
    ascvdRiskReason: z.string().optional(),
    usedAverageMarkers: z.boolean().optional(),
    actionPlan: z.array(z.object({
      id: z.string(),
      title: z.string(),
      rationale: z.string(),
      priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      relatedMarkers: z.array(z.string()),
    })).optional(),
  }),
});

/** PUT /api/profile — upsert user profile */
export const saveProfileSchema = z.object({
  profile: userProfileSchema,
});
