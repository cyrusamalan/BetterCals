import { describe, it, expect } from 'vitest';
import {
  calculateTDEE,
  calculateHealthScore,
  identifyDeficiencies,
  identifyRisks,
  calculateCalorieTiers,
  calculateMacros,
  calculateBMI,
  calculateWaistToHipRatio,
  deriveMarkers,
  focusGoalList,
} from '@/lib/calculations';
import type { UserProfile, BloodMarkers } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────
function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    age: 30,
    gender: 'male',
    weightLbs: 180,
    heightFeet: 5,
    heightInches: 10,
    activityLevel: 'moderate',
    goal: 'maintain',
    ...overrides,
  };
}

const NORMAL_MARKERS: BloodMarkers = {
  glucose: 90,
  hba1c: 5.2,
  totalCholesterol: 180,
  ldl: 100,
  hdl: 55,
  triglycerides: 120,
  tsh: 2.0,
  vitaminD: 40,
  vitaminB12: 500,
  ferritin: 80,
  iron: 90,
  alt: 25,
  ast: 22,
  albumin: 4.2,
  creatinine: 1.0,
  uricAcid: 5.5,
  fastingInsulin: 6,
};

// ── calculateTDEE ──────────────────────────────────────────────────────────
describe('calculateTDEE', () => {
  it('returns positive BMR, TDEE, and target calories', () => {
    const result = calculateTDEE(makeProfile());
    expect(result.bmr).toBeGreaterThan(0);
    expect(result.tdee).toBeGreaterThan(result.bmr);
    expect(result.targetCalories).toBeGreaterThan(0);
  });

  it('males have higher BMR than females of same stats', () => {
    const male = calculateTDEE(makeProfile({ gender: 'male' }));
    const female = calculateTDEE(makeProfile({ gender: 'female' }));
    expect(male.bmr).toBeGreaterThan(female.bmr);
  });

  it('loss goals produce fewer target calories than maintenance', () => {
    const maintain = calculateTDEE(makeProfile({ goal: 'maintain' }));
    const lose = calculateTDEE(makeProfile({ goal: 'lose-moderate' }));
    expect(lose.targetCalories).toBeLessThan(maintain.targetCalories);
  });

  it('gain goals produce more target calories than maintenance', () => {
    const maintain = calculateTDEE(makeProfile({ goal: 'maintain' }));
    const gain = calculateTDEE(makeProfile({ goal: 'gain-lean' }));
    expect(gain.targetCalories).toBeGreaterThan(maintain.targetCalories);
  });

  it('uses Katch-McArdle when body fat percentage is provided', () => {
    const standard = calculateTDEE(makeProfile());
    const withBf = calculateTDEE(makeProfile({ bodyFatPercentage: 15 }));
    // They should differ because Katch-McArdle uses a different formula
    expect(withBf.bmr).not.toBe(standard.bmr);
  });

  it('advanced activity mode uses NEAT + exercise instead of multiplier', () => {
    const result = calculateTDEE(makeProfile({
      advancedActivity: true,
      dailySteps: 10000,
      occupationType: 'desk',
      exerciseTemplate: 'balanced',
    }));
    expect(result.neatCalories).toBeDefined();
    expect(result.exerciseCalories).toBeDefined();
    expect(result.tdee).toBeGreaterThan(result.bmr);
  });

  it('clamps extreme weight values', () => {
    // Even with absurd inputs, should not produce NaN or negative
    const result = calculateTDEE(makeProfile({ weightLbs: 10 }));
    expect(result.bmr).toBeGreaterThan(0);
    expect(Number.isFinite(result.bmr)).toBe(true);
  });

  it('higher activity level produces higher TDEE', () => {
    const sedentary = calculateTDEE(makeProfile({ activityLevel: 'sedentary' }));
    const active = calculateTDEE(makeProfile({ activityLevel: 'very-active' }));
    expect(active.tdee).toBeGreaterThan(sedentary.tdee);
  });
});

// ── calculateHealthScore ───────────────────────────────────────────────────
describe('calculateHealthScore', () => {
  it('returns a score for all normal markers', () => {
    const score = calculateHealthScore(NORMAL_MARKERS, { gender: 'male' });
    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.metabolic).toBeGreaterThan(0);
    expect(score.cardiovascular).toBeGreaterThan(0);
  });

  it('returns zeroes when no markers provided', () => {
    const score = calculateHealthScore({});
    expect(score.overall).toBe(0);
    expect(score.metabolic).toBe(0);
  });

  it('high-risk markers produce lower scores', () => {
    const good = calculateHealthScore(NORMAL_MARKERS, { gender: 'male' });
    const bad = calculateHealthScore({
      glucose: 250,
      hba1c: 8.0,
      ldl: 200,
      hdl: 30,
    }, { gender: 'male' });
    expect(bad.overall).toBeLessThan(good.overall);
  });
});

// ── identifyDeficiencies ───────────────────────────────────────────────────
describe('identifyDeficiencies', () => {
  it('returns empty for normal markers', () => {
    const defs = identifyDeficiencies(NORMAL_MARKERS, { gender: 'male' });
    expect(defs).toEqual([]);
  });

  it('detects low vitamin D', () => {
    // vitaminD at 15 is 'low' status (12-19 range)
    const defs = identifyDeficiencies({ vitaminD: 15 }, { gender: 'male' });
    expect(defs.some(d => d.toLowerCase().includes('vitamin d'))).toBe(true);
  });

  it('detects low ferritin', () => {
    // ferritin at 12 for female is 'low' status (10-14 range)
    const defs = identifyDeficiencies({ ferritin: 12 }, { gender: 'female' });
    expect(defs.some(d => d.toLowerCase().includes('ferritin') || d.toLowerCase().includes('iron'))).toBe(true);
  });
});

// ── identifyRisks ──────────────────────────────────────────────────────────
describe('identifyRisks', () => {
  it('returns empty for normal markers', () => {
    const risks = identifyRisks(NORMAL_MARKERS, { gender: 'male' });
    expect(risks).toEqual([]);
  });

  it('detects high glucose risk', () => {
    const risks = identifyRisks({ glucose: 200 }, { gender: 'male' });
    expect(risks.length).toBeGreaterThan(0);
    expect(risks.some(r => r.toLowerCase().includes('glucose'))).toBe(true);
  });

  it('detects high LDL risk', () => {
    const risks = identifyRisks({ ldl: 190 }, { gender: 'male' });
    expect(risks.length).toBeGreaterThan(0);
  });
});

// ── calculateCalorieTiers ──────────────────────────────────────────────────
describe('calculateCalorieTiers', () => {
  it('returns 6 tiers', () => {
    const tiers = calculateCalorieTiers(2500);
    expect(tiers).toHaveLength(6);
  });

  it('tiers are in ascending order of daily calories', () => {
    const tiers = calculateCalorieTiers(2500);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].dailyCalories).toBeGreaterThanOrEqual(tiers[i - 1].dailyCalories);
    }
  });

  it('maintain tier equals TDEE', () => {
    const tiers = calculateCalorieTiers(2500);
    const maintain = tiers.find(t => t.label === 'Maintain');
    expect(maintain?.dailyCalories).toBe(2500);
    expect(maintain?.dailyChange).toBe(0);
  });

  it('enforces 1200 kcal floor', () => {
    const tiers = calculateCalorieTiers(1400);
    for (const tier of tiers) {
      expect(tier.dailyCalories).toBeGreaterThanOrEqual(1200);
    }
  });
});

// ── calculateMacros ────────────────────────────────────────────────────────
describe('calculateMacros', () => {
  it('macros sum to approximately total calories', () => {
    const macros = calculateMacros(2000, 'maintain', { weightLbs: 180, gender: 'male', focusGoal: [] });
    const totalCal = macros.protein.grams * 4 + macros.carbs.grams * 4 + macros.fat.grams * 9;
    expect(Math.abs(totalCal - macros.calories)).toBeLessThan(10);
  });

  it('loss goals have higher protein per calorie', () => {
    const lose = calculateMacros(2000, 'lose-aggressive', { weightLbs: 180, gender: 'male', focusGoal: [] });
    const maintain = calculateMacros(2000, 'maintain', { weightLbs: 180, gender: 'male', focusGoal: [] });
    expect(lose.protein.grams).toBeGreaterThanOrEqual(maintain.protein.grams);
  });

  it('recompMode activates with both fat-loss and muscle-gain focus', () => {
    const macros = calculateMacros(2000, 'maintain', {
      weightLbs: 180,
      gender: 'male',
      focusGoal: ['fat-loss', 'muscle-gain'],
    });
    expect(macros.recompMode).toBe(true);
  });

  it('all macro percentages are positive', () => {
    const macros = calculateMacros(2000, 'maintain');
    expect(macros.protein.pct).toBeGreaterThan(0);
    expect(macros.carbs.pct).toBeGreaterThan(0);
    expect(macros.fat.pct).toBeGreaterThan(0);
  });
});

// ── calculateBMI ───────────────────────────────────────────────────────────
describe('calculateBMI', () => {
  it('classifies normal BMI correctly', () => {
    const { bmi, category } = calculateBMI(150, 5, 9);
    expect(bmi).toBeGreaterThan(18.5);
    expect(bmi).toBeLessThan(25);
    expect(category).toBe('Normal');
  });

  it('classifies underweight correctly', () => {
    const { category } = calculateBMI(100, 5, 10);
    expect(category).toBe('Underweight');
  });

  it('classifies obese correctly', () => {
    const { category } = calculateBMI(300, 5, 6);
    expect(category).toBe('Obese');
  });
});

// ── calculateWaistToHipRatio ───────────────────────────────────────────────
describe('calculateWaistToHipRatio', () => {
  it('normal male ratio', () => {
    const { ratio, interpretation } = calculateWaistToHipRatio(34, 40, 'male');
    expect(ratio).toBe(0.85);
    expect(interpretation).toBe('Normal');
  });

  it('high risk female ratio', () => {
    const { interpretation } = calculateWaistToHipRatio(38, 40, 'female');
    expect(interpretation).toBe('High Risk');
  });
});

// ── deriveMarkers ──────────────────────────────────────────────────────────
describe('deriveMarkers', () => {
  it('derives Non-HDL from TC and HDL', () => {
    const derived = deriveMarkers({ totalCholesterol: 200, hdl: 55 });
    expect(derived.nonHdl).toBe(145);
  });

  it('derives LDL via Friedewald when TG < 400', () => {
    const derived = deriveMarkers({ totalCholesterol: 200, hdl: 50, triglycerides: 150 });
    // Friedewald: 200 - 50 - 150/5 = 120
    expect(derived.ldl).toBe(120);
  });

  it('does not derive LDL when already provided', () => {
    const derived = deriveMarkers({ totalCholesterol: 200, hdl: 50, triglycerides: 150, ldl: 130 });
    expect(derived.ldl).toBeUndefined();
  });

  it('does not derive nonHdl when already provided', () => {
    const derived = deriveMarkers({ totalCholesterol: 200, hdl: 50, nonHdl: 160 });
    expect(derived.nonHdl).toBeUndefined();
  });

  it('returns empty for insufficient markers', () => {
    const derived = deriveMarkers({});
    expect(derived).toEqual({});
  });
});

// ── focusGoalList ──────────────────────────────────────────────────────────
describe('focusGoalList', () => {
  it('returns empty array when no focus goals', () => {
    expect(focusGoalList({})).toEqual([]);
  });

  it('returns the focus goals array', () => {
    expect(focusGoalList({ focusGoal: ['fat-loss', 'endurance'] })).toEqual(['fat-loss', 'endurance']);
  });
});
