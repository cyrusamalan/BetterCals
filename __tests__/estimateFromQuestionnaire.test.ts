import { describe, it, expect } from 'vitest';
import {
  estimateMarkersFromLifestyle,
  ESTIMATED_MARKER_KEYS,
  type QuestionnaireAnswers,
} from '@/lib/estimateFromQuestionnaire';
import { isPlausibleValue } from '@/lib/bloodParser';
import type { UserProfile } from '@/types';

const baseProfile: UserProfile = {
  age: 35,
  gender: 'male',
  weightLbs: 175,
  heightFeet: 5,
  heightInches: 10,
  activityLevel: 'moderate',
  goal: 'maintain',
};

const cleanAnswers: QuestionnaireAnswers = {
  dietQuality: 'clean',
  saturatedFatIntake: 'low',
  fiberIntake: 'high',
  cardioFrequency: 'high',
  resistanceTraining: true,
  knownLipidIssue: 'none',
  knownGlucoseIssue: 'none',
  recentWeightChange: 'stable',
};

const poorAnswers: QuestionnaireAnswers = {
  dietQuality: 'poor',
  saturatedFatIntake: 'high',
  fiberIntake: 'low',
  cardioFrequency: 'none',
  resistanceTraining: false,
  knownLipidIssue: 'borderline',
  knownGlucoseIssue: 'none',
  recentWeightChange: 'gaining',
};

describe('estimateMarkersFromLifestyle', () => {
  it('returns estimates for the documented marker subset', () => {
    const result = estimateMarkersFromLifestyle(baseProfile, cleanAnswers);
    const keys = Object.keys(result.estimates);
    for (const key of keys) {
      expect(ESTIMATED_MARKER_KEYS).toContain(key);
    }
    expect(keys.length).toBeGreaterThan(0);
  });

  it('mid value falls within returned [low, high] range', () => {
    const result = estimateMarkersFromLifestyle(baseProfile, cleanAnswers);
    for (const [, est] of Object.entries(result.estimates)) {
      if (!est) continue;
      expect(est.mid).toBeGreaterThanOrEqual(est.low);
      expect(est.mid).toBeLessThanOrEqual(est.high);
    }
  });

  it('all estimated values are plausible', () => {
    const result = estimateMarkersFromLifestyle(baseProfile, poorAnswers);
    for (const [key, est] of Object.entries(result.estimates)) {
      if (!est) continue;
      expect(isPlausibleValue(key as keyof typeof result.markers, est.mid)).toBe(true);
    }
  });

  it('clean lifestyle yields better lipid/glucose tiers than poor lifestyle', () => {
    const clean = estimateMarkersFromLifestyle(baseProfile, cleanAnswers);
    const poor = estimateMarkersFromLifestyle(baseProfile, poorAnswers);

    expect(clean.estimates.ldl?.mid ?? 0).toBeLessThan(poor.estimates.ldl?.mid ?? 0);
    expect(clean.estimates.totalCholesterol?.mid ?? 0).toBeLessThan(
      poor.estimates.totalCholesterol?.mid ?? 0,
    );
    expect(clean.estimates.triglycerides?.mid ?? 0).toBeLessThan(
      poor.estimates.triglycerides?.mid ?? 0,
    );
    // HDL: higher is better — clean should beat poor.
    expect(clean.estimates.hdl?.mid ?? 0).toBeGreaterThan(poor.estimates.hdl?.mid ?? 0);
  });

  it('diabetic profile pushes glucose markers into elevated tiers', () => {
    const diabeticProfile: UserProfile = { ...baseProfile, diabetic: true };
    const sedentary: QuestionnaireAnswers = {
      ...poorAnswers,
      knownGlucoseIssue: 'diabetes',
    };
    const result = estimateMarkersFromLifestyle(diabeticProfile, sedentary);
    const glucoseTier = result.estimates.glucose?.tier;
    const hba1cTier = result.estimates.hba1c?.tier;
    expect(['borderline', 'high', 'critical']).toContain(glucoseTier);
    expect(['borderline', 'high', 'critical']).toContain(hba1cTier);
  });

  it('sedentary smoker with high sat fat yields borderline+ LDL', () => {
    const profile: UserProfile = { ...baseProfile, smoker: true, familyHeartDisease: true };
    const result = estimateMarkersFromLifestyle(profile, poorAnswers);
    expect(['borderline', 'high', 'critical']).toContain(result.estimates.ldl?.tier);
  });

  it('markers object only contains finite numbers', () => {
    const result = estimateMarkersFromLifestyle(baseProfile, cleanAnswers);
    for (const [, value] of Object.entries(result.markers)) {
      expect(typeof value).toBe('number');
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
