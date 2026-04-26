import { describe, it, expect } from 'vitest';
import { validateAndCoercePlan, buildFallbackPlan } from '@/lib/ai/dietPlan';
import type { AnalysisResult, BloodMarkers, UserProfile } from '@/types';

const baseProfile: UserProfile = {
  age: 35,
  gender: 'male',
  weightLbs: 180,
  heightFeet: 5,
  heightInches: 10,
  activityLevel: 'moderate',
  goal: 'maintain',
};

const baseMarkers: BloodMarkers = {};

const baseResult: AnalysisResult = {
  tdee: { bmr: 1700, tdee: 2400, targetCalories: 2400, activityMultiplier: 1.55 },
  healthScore: { overall: 80, metabolic: 80, cardiovascular: 80, hormonal: 80, nutritional: 80, hepatic: 80, renal: 80 },
  insights: [],
  deficiencies: [],
  risks: [],
  calorieTiers: [],
  macros: {
    protein: { grams: 180, pct: 30 },
    carbs: { grams: 240, pct: 40 },
    fat: { grams: 80, pct: 30 },
    calories: 2400,
  },
  recommendations: {
    bmi: 25,
    bmiCategory: 'normal',
    waterIntakeOz: 100,
    ldlHdlRatio: null,
    ldlHdlInterpretation: null,
    tgHdlRatio: null,
    tgHdlInterpretation: null,
    waistToHipRatio: null,
    waistToHipInterpretation: null,
    homaIR: null,
    homaIRInterpretation: null,
    tyg: null,
    tygInterpretation: null,
    supplements: [],
    exerciseSuggestions: [],
    mealTiming: [],
  },
};

const input = { profile: baseProfile, markers: baseMarkers, result: baseResult };

describe('validateAndCoercePlan', () => {
  it('returns null for non-object input', () => {
    expect(validateAndCoercePlan(null, input)).toBeNull();
    expect(validateAndCoercePlan('not json', input)).toBeNull();
    expect(validateAndCoercePlan({}, input)).toBeNull();
  });

  it('returns null when fewer than 2 valid meals are provided', () => {
    const result = validateAndCoercePlan({ meals: [] }, input);
    expect(result).toBeNull();
  });

  it('coerces a valid plan and rounds macro values', () => {
    const raw = {
      summary: 'Test plan',
      hydrationOz: 96.7,
      keyPrinciples: ['Eat protein', 'Hydrate', 12345],
      meals: [
        { slot: 'breakfast', name: 'Oats bowl', calories: 600.4, protein: 35.6, carbs: 70.1, fat: 18.9, ingredients: ['oats', 'berries'], prepNotes: 'Combine.', rationale: 'Fiber' },
        { slot: 'lunch', name: 'Chicken salad', calories: 700, protein: 50, carbs: 60, fat: 25, ingredients: ['chicken'], prepNotes: 'Toss.' },
        { slot: 'invalid-slot', name: 'should be dropped', calories: 100, protein: 10, carbs: 10, fat: 5, ingredients: [], prepNotes: '' },
      ],
      flags: ['Test flag'],
    };
    const plan = validateAndCoercePlan(raw, input, 'test-model');
    expect(plan).not.toBeNull();
    expect(plan!.meals).toHaveLength(2);
    expect(plan!.meals[0].calories).toBe(600);
    expect(plan!.meals[0].protein).toBe(36);
    expect(plan!.hydrationOz).toBe(97);
    expect(plan!.keyPrinciples).toEqual(['Eat protein', 'Hydrate']); // non-string filtered
    expect(plan!.modelUsed).toBe('test-model');
    expect(plan!.flags).toEqual(['Test flag']);
  });

  it('drops meals missing required numeric fields', () => {
    const raw = {
      meals: [
        { slot: 'breakfast', name: 'Bowl', calories: 500, protein: 30, carbs: 50, fat: 15, ingredients: [], prepNotes: '' },
        { slot: 'lunch', name: 'Plate', calories: 'not a number', protein: 30, carbs: 50, fat: 15, ingredients: [], prepNotes: '' },
      ],
    };
    const plan = validateAndCoercePlan(raw, input);
    // Only 1 valid meal → below min threshold
    expect(plan).toBeNull();
  });
});

describe('buildFallbackPlan', () => {
  it('produces 4 meals that approximately sum to target calories', () => {
    const plan = buildFallbackPlan(input);
    expect(plan.meals).toHaveLength(4);
    const totalCals = plan.meals.reduce((sum, m) => sum + m.calories, 0);
    // 30+35+25+10 = 100% so should equal targetCalories within rounding noise
    expect(Math.abs(totalCals - 2400)).toBeLessThanOrEqual(4);
  });

  it('avoids dairy when allergy is set', () => {
    const profile: UserProfile = { ...baseProfile, allergies: ['dairy'], dietaryPattern: 'vegetarian' };
    const plan = buildFallbackPlan({ ...input, profile });
    const ingredientText = plan.meals.flatMap((m) => m.ingredients).join(' ').toLowerCase();
    expect(ingredientText).not.toContain('yogurt');
    expect(plan.flags?.some((f) => f.toLowerCase().includes('dairy'))).toBe(true);
  });

  it('marks itself as fallback in flags', () => {
    const plan = buildFallbackPlan(input);
    expect(plan.flags?.some((f) => f.toLowerCase().includes('fallback'))).toBe(true);
  });
});
