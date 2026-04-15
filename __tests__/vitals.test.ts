import { describe, it, expect } from 'vitest';
import { classifyRHR } from '@/lib/vitals';

const sedentary = { activityLevel: 'sedentary' as const };
const veryActive = { activityLevel: 'very-active' as const };
const moderate = { activityLevel: 'moderate' as const };

// Ordering of MarkerStatus from best to worst for severity comparisons.
const STATUS_ORDER = [
  'optimal',
  'normal',
  'borderline',
  'low',
  'high',
  'critical',
  'unknown',
] as const;

function severity(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as typeof STATUS_ORDER[number]);
  return idx === -1 ? 99 : idx;
}

describe('classifyRHR', () => {
  it('returns null when value is missing', () => {
    expect(classifyRHR(undefined, sedentary)).toBeNull();
  });

  it('returns null for NaN / non-finite input', () => {
    expect(classifyRHR(Number.NaN, sedentary)).toBeNull();
    expect(classifyRHR(Number.POSITIVE_INFINITY, sedentary)).toBeNull();
  });

  it('returns null for implausible values (clamp)', () => {
    expect(classifyRHR(10, sedentary)).toBeNull();
    expect(classifyRHR(300, sedentary)).toBeNull();
  });

  it('flags <40 bpm as bradycardia regardless of activity level', () => {
    expect(classifyRHR(35, sedentary)?.status).toBe('critical');
    expect(classifyRHR(35, veryActive)?.status).toBe('critical');
    expect(classifyRHR(35, sedentary)?.label).toMatch(/bradycardia/i);
  });

  it('treats 45 bpm as Excellent for very-active users but low for sedentary', () => {
    const athletic = classifyRHR(45, veryActive);
    const sedentaryResult = classifyRHR(45, sedentary);
    expect(athletic?.status).toBe('optimal');
    expect(sedentaryResult?.status).toBe('low');
  });

  it('classifies 55 bpm as Excellent for all activity levels', () => {
    expect(classifyRHR(55, sedentary)?.status).toBe('optimal');
    expect(classifyRHR(55, veryActive)?.status).toBe('optimal');
  });

  it('classifies 65 bpm as normal (Good)', () => {
    expect(classifyRHR(65, moderate)?.status).toBe('normal');
    expect(classifyRHR(65, moderate)?.label).toMatch(/good/i);
  });

  it('classifies 78 bpm as Elevated (borderline)', () => {
    expect(classifyRHR(78, moderate)?.status).toBe('borderline');
  });

  it('classifies 92 bpm as High', () => {
    expect(classifyRHR(92, moderate)?.status).toBe('high');
  });

  it('always classifies 100+ bpm as Tachycardia regardless of activity', () => {
    expect(classifyRHR(100, sedentary)?.status).toBe('critical');
    expect(classifyRHR(115, veryActive)?.status).toBe('critical');
    expect(classifyRHR(100, moderate)?.label).toMatch(/tachycardia/i);
  });

  it('severity is non-decreasing as RHR increases past 70', () => {
    const points = [72, 78, 85, 88, 95, 100, 110];
    let prev = -1;
    for (const bpm of points) {
      const tier = classifyRHR(bpm, moderate);
      expect(tier).not.toBeNull();
      const s = severity(tier!.status);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it('boundary: 49 vs 50 moves from low to optimal for sedentary', () => {
    expect(classifyRHR(49, sedentary)?.status).toBe('low');
    expect(classifyRHR(50, sedentary)?.status).toBe('optimal');
  });

  it('boundary: 70 is still Good, 71 becomes Elevated', () => {
    expect(classifyRHR(70, moderate)?.status).toBe('normal');
    expect(classifyRHR(71, moderate)?.status).toBe('borderline');
  });
});
