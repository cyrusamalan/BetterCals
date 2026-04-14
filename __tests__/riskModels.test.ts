import { describe, it, expect } from 'vitest';
import { calculateCVDRisk, calculateASCVDRisk } from '@/lib/riskModels';
import type { UserProfile, BloodMarkers } from '@/types';

function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    age: 55,
    gender: 'male',
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

describe('calculateCVDRisk (Framingham 2008)', () => {
  it('returns a risk percentage for valid inputs', () => {
    const result = calculateCVDRisk(makeProfile(), BASE_MARKERS);
    expect(result.risk).not.toBeNull();
    expect(result.risk).toBeGreaterThanOrEqual(0);
    expect(result.risk).toBeLessThanOrEqual(100);
  });

  it('returns null for age < 30', () => {
    const result = calculateCVDRisk(makeProfile({ age: 25 }), BASE_MARKERS);
    expect(result.risk).toBeNull();
    expect(result.reason).toBeDefined();
  });

  it('returns null for age > 74', () => {
    const result = calculateCVDRisk(makeProfile({ age: 80 }), BASE_MARKERS);
    expect(result.risk).toBeNull();
  });

  it('computes at the lower boundary (age 30)', () => {
    const result = calculateCVDRisk(makeProfile({ age: 30 }), BASE_MARKERS);
    expect(result.risk).not.toBeNull();
  });

  it('computes at the upper boundary (age 74)', () => {
    const result = calculateCVDRisk(makeProfile({ age: 74 }), BASE_MARKERS);
    expect(result.risk).not.toBeNull();
  });

  it('returns null when TC is missing', () => {
    const result = calculateCVDRisk(makeProfile(), { hdl: 50 });
    expect(result.risk).toBeNull();
  });

  it('returns null when HDL is missing', () => {
    const result = calculateCVDRisk(makeProfile(), { totalCholesterol: 200 });
    expect(result.risk).toBeNull();
  });

  it('returns null when systolic BP is missing', () => {
    const result = calculateCVDRisk(
      makeProfile({ bloodPressureSystolic: undefined }),
      BASE_MARKERS,
    );
    expect(result.risk).toBeNull();
  });

  it('smokers have higher risk than non-smokers', () => {
    const nonSmoker = calculateCVDRisk(makeProfile({ smoker: false }), BASE_MARKERS);
    const smoker = calculateCVDRisk(makeProfile({ smoker: true }), BASE_MARKERS);
    expect(smoker.risk!).toBeGreaterThan(nonSmoker.risk!);
  });

  it('diabetics have higher risk than non-diabetics', () => {
    const nonDiabetic = calculateCVDRisk(makeProfile({ diabetic: false }), BASE_MARKERS);
    const diabetic = calculateCVDRisk(makeProfile({ diabetic: true }), BASE_MARKERS);
    expect(diabetic.risk!).toBeGreaterThan(nonDiabetic.risk!);
  });

  it('higher SBP increases risk', () => {
    const low = calculateCVDRisk(makeProfile({ bloodPressureSystolic: 110 }), BASE_MARKERS);
    const high = calculateCVDRisk(makeProfile({ bloodPressureSystolic: 170 }), BASE_MARKERS);
    expect(high.risk!).toBeGreaterThan(low.risk!);
  });

  it('older age increases risk', () => {
    const younger = calculateCVDRisk(makeProfile({ age: 45 }), BASE_MARKERS);
    const older = calculateCVDRisk(makeProfile({ age: 70 }), BASE_MARKERS);
    expect(older.risk!).toBeGreaterThan(younger.risk!);
  });

  it('higher HDL decreases risk', () => {
    const lowHdl = calculateCVDRisk(makeProfile(), { totalCholesterol: 200, hdl: 35 });
    const highHdl = calculateCVDRisk(makeProfile(), { totalCholesterol: 200, hdl: 70 });
    expect(highHdl.risk!).toBeLessThan(lowHdl.risk!);
  });

  it('higher total cholesterol increases risk', () => {
    const lowTC = calculateCVDRisk(makeProfile(), { totalCholesterol: 160, hdl: 50 });
    const highTC = calculateCVDRisk(makeProfile(), { totalCholesterol: 260, hdl: 50 });
    expect(highTC.risk!).toBeGreaterThan(lowTC.risk!);
  });

  it('computes for female coefficients', () => {
    const result = calculateCVDRisk(makeProfile({ gender: 'female' }), BASE_MARKERS);
    expect(result.risk).not.toBeNull();
    expect(result.risk!).toBeGreaterThan(0);
  });

  it('treated hypertension affects risk', () => {
    const untreated = calculateCVDRisk(
      makeProfile({ treatedForHypertension: false }),
      BASE_MARKERS,
    );
    const treated = calculateCVDRisk(
      makeProfile({ treatedForHypertension: true }),
      BASE_MARKERS,
    );
    // Treated SBP uses a slightly higher coefficient (reflects residual risk on treatment)
    expect(treated.risk).not.toBe(untreated.risk);
  });

  it('produces a plausible risk for a healthy 61-year-old woman', () => {
    // Sanity check: 61yo non-smoking, non-diabetic woman with near-optimal lipids
    // and normal BP should land in the low-to-moderate 10-yr CVD risk range.
    const result = calculateCVDRisk(
      makeProfile({
        age: 61,
        gender: 'female',
        bloodPressureSystolic: 124,
        treatedForHypertension: false,
        smoker: false,
        diabetic: false,
      }),
      { totalCholesterol: 180, hdl: 47 },
    );
    expect(result.risk).not.toBeNull();
    expect(result.risk!).toBeGreaterThan(3);
    expect(result.risk!).toBeLessThan(15);
  });

  it('produces a materially higher risk for the same woman with uncontrolled risk factors', () => {
    // Same profile as above but smoker + diabetic + elevated BP + poor lipids — the
    // risk should escalate substantially (well past the low-risk band).
    const healthy = calculateCVDRisk(
      makeProfile({
        age: 61, gender: 'female', bloodPressureSystolic: 124,
        smoker: false, diabetic: false,
      }),
      { totalCholesterol: 180, hdl: 47 },
    );
    const unhealthy = calculateCVDRisk(
      makeProfile({
        age: 61, gender: 'female', bloodPressureSystolic: 160,
        smoker: true, diabetic: true,
      }),
      { totalCholesterol: 260, hdl: 35 },
    );
    expect(unhealthy.risk!).toBeGreaterThan(healthy.risk! * 3);
  });

  it('exposes calculateASCVDRisk as a backwards-compat alias', () => {
    const a = calculateCVDRisk(makeProfile(), BASE_MARKERS);
    const b = calculateASCVDRisk(makeProfile(), BASE_MARKERS);
    expect(a.risk).toBe(b.risk);
  });
});
