import { describe, expect, it } from 'vitest';
import { isCoachReplyGrounded } from '@/lib/ai/coachSafety';
import type { AnalysisResult, BloodMarkers, CoachPlan, UserProfile } from '@/types';

const profile: UserProfile = {
  age: 34,
  gender: 'male',
  weightLbs: 180,
  heightFeet: 5,
  heightInches: 10,
  activityLevel: 'moderate',
  goal: 'lose-moderate',
};

const markers: BloodMarkers = { glucose: 95, hba1c: 5.3, ldl: 110 };

const result: AnalysisResult = {
  tdee: { bmr: 1750, tdee: 2400, targetCalories: 2000, activityMultiplier: 1.4 },
  healthScore: { overall: 82, metabolic: 84, cardiovascular: 77, hormonal: 80, nutritional: 83, hepatic: 82, renal: 86 },
  insights: [],
  deficiencies: [],
  risks: [],
  calorieTiers: [{ label: 'Maintain', weeklyChange: '0 lb/week', dailyCalories: 2400, dailyChange: 0 }],
  macros: {
    protein: { grams: 160, pct: 32 },
    carbs: { grams: 200, pct: 40 },
    fat: { grams: 62, pct: 28 },
    calories: 2000,
  },
  recommendations: {
    bmi: 25.8,
    bmiCategory: 'Overweight',
    waterIntakeOz: 96,
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

const plan: CoachPlan = {
  summary: 'Test plan',
  priorities: [{ title: 'Improve glucose control', reason: 'Based on fasting glucose', relatedMarkers: ['glucose'] }],
  weeklyActions: [{ title: 'Target calories', details: 'Aim for 2000 calories daily.' }],
  whyItMatters: ['Because consistency helps.'],
  guardrails: ['Educational only.'],
};

describe('isCoachReplyGrounded', () => {
  it('accepts grounded response with known numbers', () => {
    const reply = 'Aim for 2000 calories and keep glucose near 95 while protecting your 82/100 score.';
    expect(isCoachReplyGrounded(reply, { profile, markers, result, plan })).toBe(true);
  });

  it('accepts derived calorie deltas from grounded anchors', () => {
    const reply = 'Move from 2400 to 2000 calories for a 400 calorie deficit and reassess after 14 days.';
    expect(isCoachReplyGrounded(reply, { profile, markers, result, plan })).toBe(true);
  });

  it('accepts comma-formatted and plus-suffixed grounded numbers', () => {
    const productionLikeResult: AnalysisResult = {
      ...result,
      tdee: { ...result.tdee, targetCalories: 2262 },
      calorieTiers: [
        { label: 'Maintain', weeklyChange: '0 lb/week', dailyCalories: 2762, dailyChange: 0 },
        { label: 'Lose 1 lb/wk', weeklyChange: '-1 lb/week', dailyCalories: 2262, dailyChange: -500 },
      ],
      macros: {
        ...result.macros,
        protein: { ...result.macros.protein, grams: 171 },
        calories: 2262,
      },
      recommendations: {
        ...result.recommendations,
        homaIR: 7.6,
        exerciseSuggestions: ['Increase to 150 min moderate cardio per week'],
      },
    };

    const productionLikeMarkers: BloodMarkers = {
      glucose: 110,
      hba1c: 6.3,
      triglycerides: 220,
      hdl: 38,
      alt: 65,
      ast: 55,
      hsCRP: 5.2,
      ferritin: 15,
      iron: 45,
    };

    const productionLikePlan: CoachPlan = {
      ...plan,
      weeklyActions: [
        { title: 'NEAT consistency', details: 'Hold 8,000+ steps/day with steady pacing.' },
        { title: 'Post-meal walks', details: 'Use 15-minute walks after two meals.' },
      ],
    };

    const reply = [
      'To lose weight effectively, prioritize your 2,262 calorie target while addressing high insulin resistance (HOMA-IR: 7.6).',
      '- If needed, move from 2,762 maintenance to 2,262 after 14 days.',
      '- Hit 171g protein daily.',
      '- Add 150 minutes of moderate cardio per week for triglycerides 220 and HDL 38.',
      '- Add 15-minute post-meal walks for glucose 110 and HbA1c 6.3.',
      '- Keep NEAT at 8,000+ steps/day.',
      '- Avoid hard pushes while ALT 65, AST 55, hs-CRP 5.2, ferritin 15, and iron 45 are still off.',
    ].join('\n');

    expect(
      isCoachReplyGrounded(reply, {
        profile,
        markers: productionLikeMarkers,
        result: productionLikeResult,
        plan: productionLikePlan,
      }),
    ).toBe(true);
  });

  it('accepts slightly rounded numeric anchors', () => {
    const roundedResult: AnalysisResult = {
      ...result,
      recommendations: {
        ...result.recommendations,
        homaIR: 7.64,
      },
    };

    const reply = 'Keep calories around 2000 and address insulin resistance (HOMA-IR 7.6) this week.';
    expect(
      isCoachReplyGrounded(reply, {
        profile,
        markers,
        result: roundedResult,
        plan,
      }),
    ).toBe(true);
  });

  it('rejects ungrounded novel numbers', () => {
    const reply = 'Set calories to 3100 and target LDL 70 immediately.';
    expect(isCoachReplyGrounded(reply, { profile, markers, result, plan })).toBe(false);
  });
});
