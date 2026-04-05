import { describe, it, expect } from 'vitest';
import { bloodMarkersSchema, userProfileSchema, saveAnalysisSchema, saveProfileSchema } from '@/lib/schemas';

describe('bloodMarkersSchema', () => {
  it('accepts valid markers', () => {
    const result = bloodMarkersSchema.safeParse({ glucose: 95, hba1c: 5.2 });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = bloodMarkersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects glucose below minimum', () => {
    const result = bloodMarkersSchema.safeParse({ glucose: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects glucose above maximum', () => {
    const result = bloodMarkersSchema.safeParse({ glucose: 700 });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric marker values', () => {
    const result = bloodMarkersSchema.safeParse({ glucose: 'high' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown marker keys (strict mode)', () => {
    const result = bloodMarkersSchema.safeParse({ glucose: 95, unknownMarker: 42 });
    expect(result.success).toBe(false);
  });
});

describe('userProfileSchema', () => {
  const validProfile = {
    age: 30,
    gender: 'male' as const,
    weightLbs: 180,
    heightFeet: 5,
    heightInches: 10,
    activityLevel: 'moderate' as const,
    goal: 'maintain' as const,
  };

  it('accepts valid profile', () => {
    const result = userProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = userProfileSchema.safeParse({ age: 30 });
    expect(result.success).toBe(false);
  });

  it('rejects age below minimum', () => {
    const result = userProfileSchema.safeParse({ ...validProfile, age: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects age above maximum', () => {
    const result = userProfileSchema.safeParse({ ...validProfile, age: 150 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid gender', () => {
    const result = userProfileSchema.safeParse({ ...validProfile, gender: 'other' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid activity level', () => {
    const result = userProfileSchema.safeParse({ ...validProfile, activityLevel: 'extreme' });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = userProfileSchema.safeParse({
      ...validProfile,
      smoker: true,
      diabetic: false,
      bloodPressureSystolic: 120,
      focusGoal: ['fat-loss', 'muscle-gain'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects body fat percentage out of range', () => {
    const result = userProfileSchema.safeParse({ ...validProfile, bodyFatPercentage: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects weight below minimum', () => {
    const result = userProfileSchema.safeParse({ ...validProfile, weightLbs: 10 });
    expect(result.success).toBe(false);
  });
});

describe('saveProfileSchema', () => {
  it('accepts valid profile wrapper', () => {
    const result = saveProfileSchema.safeParse({
      profile: {
        age: 30,
        gender: 'male',
        weightLbs: 180,
        heightFeet: 5,
        heightInches: 10,
        activityLevel: 'moderate',
        goal: 'maintain',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing profile key', () => {
    const result = saveProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
