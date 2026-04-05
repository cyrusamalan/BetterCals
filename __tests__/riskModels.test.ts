import { describe, it, expect } from 'vitest';
import { calculateASCVDRisk } from '@/lib/riskModels';
import type { UserProfile, BloodMarkers } from '@/types';

function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    age: 55,
    gender: 'male',
    race: 'white',
    weightLbs: 180,
    heightFeet: 5,
    heightInches: 10,
    activityLevel: 'moderate',
    goal: 'maintain',
    smoker: false,
    diabetic: false,
    bloodPressureSystolic: 130,
    treatedForHypertension: false,
    ...overrides,
  };
}

const BASE_MARKERS: BloodMarkers = {
  totalCholesterol: 200,
  hdl: 50,
};

describe('calculateASCVDRisk', () => {
  it('returns a risk percentage for valid inputs', () => {
    const result = calculateASCVDRisk(makeProfile(), BASE_MARKERS);
    expect(result.risk).not.toBeNull();
    expect(result.risk).toBeGreaterThanOrEqual(0);
    expect(result.risk).toBeLessThanOrEqual(100);
  });

  it('returns null for age < 40', () => {
    const result = calculateASCVDRisk(makeProfile({ age: 35 }), BASE_MARKERS);
    expect(result.risk).toBeNull();
    expect(result.reason).toBeDefined();
  });

  it('returns null for age > 79', () => {
    const result = calculateASCVDRisk(makeProfile({ age: 85 }), BASE_MARKERS);
    expect(result.risk).toBeNull();
  });

  it('returns null when TC is missing', () => {
    const result = calculateASCVDRisk(makeProfile(), { hdl: 50 });
    expect(result.risk).toBeNull();
  });

  it('returns null when HDL is missing', () => {
    const result = calculateASCVDRisk(makeProfile(), { totalCholesterol: 200 });
    expect(result.risk).toBeNull();
  });

  it('returns null when systolic BP is missing', () => {
    const result = calculateASCVDRisk(
      makeProfile({ bloodPressureSystolic: undefined }),
      BASE_MARKERS,
    );
    expect(result.risk).toBeNull();
  });

  it('smokers have higher risk than non-smokers', () => {
    const nonSmoker = calculateASCVDRisk(makeProfile({ smoker: false }), BASE_MARKERS);
    const smoker = calculateASCVDRisk(makeProfile({ smoker: true }), BASE_MARKERS);
    expect(smoker.risk!).toBeGreaterThan(nonSmoker.risk!);
  });

  it('diabetics have higher risk than non-diabetics', () => {
    const nonDiabetic = calculateASCVDRisk(makeProfile({ diabetic: false }), BASE_MARKERS);
    const diabetic = calculateASCVDRisk(makeProfile({ diabetic: true }), BASE_MARKERS);
    expect(diabetic.risk!).toBeGreaterThan(nonDiabetic.risk!);
  });

  it('higher SBP increases risk', () => {
    const low = calculateASCVDRisk(makeProfile({ bloodPressureSystolic: 110 }), BASE_MARKERS);
    const high = calculateASCVDRisk(makeProfile({ bloodPressureSystolic: 170 }), BASE_MARKERS);
    expect(high.risk!).toBeGreaterThan(low.risk!);
  });

  it('older age increases risk', () => {
    const younger = calculateASCVDRisk(makeProfile({ age: 45 }), BASE_MARKERS);
    const older = calculateASCVDRisk(makeProfile({ age: 70 }), BASE_MARKERS);
    expect(older.risk!).toBeGreaterThan(younger.risk!);
  });

  it('computes for black male coefficients', () => {
    const result = calculateASCVDRisk(makeProfile({ race: 'black', gender: 'male' }), BASE_MARKERS);
    expect(result.risk).not.toBeNull();
    expect(result.risk).toBeGreaterThan(0);
  });

  it('computes for black female coefficients', () => {
    const result = calculateASCVDRisk(
      makeProfile({ race: 'black', gender: 'female' }),
      BASE_MARKERS,
    );
    expect(result.risk).not.toBeNull();
  });

  it('computes for white female coefficients', () => {
    const result = calculateASCVDRisk(
      makeProfile({ race: 'white', gender: 'female' }),
      BASE_MARKERS,
    );
    expect(result.risk).not.toBeNull();
  });

  it('non-white/non-black race falls back to white coefficients', () => {
    const other = calculateASCVDRisk(makeProfile({ race: 'other' }), BASE_MARKERS);
    const white = calculateASCVDRisk(makeProfile({ race: 'white' }), BASE_MARKERS);
    expect(other.risk).toBe(white.risk);
  });

  it('treated hypertension affects risk', () => {
    const untreated = calculateASCVDRisk(
      makeProfile({ treatedForHypertension: false }),
      BASE_MARKERS,
    );
    const treated = calculateASCVDRisk(
      makeProfile({ treatedForHypertension: true }),
      BASE_MARKERS,
    );
    // Treated SBP uses different (usually higher) coefficients
    expect(treated.risk).not.toBe(untreated.risk);
  });
});
