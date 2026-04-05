import { describe, it, expect } from 'vitest';
import {
  getMarkerInterpretation,
  isPlausibleValue,
  parseBloodReport,
  formatMarkerValue,
  getMarkerUnit,
  getMarkerTiers,
} from '@/lib/bloodParser';

// ── getMarkerInterpretation ────────────────────────────────────────────────
describe('getMarkerInterpretation', () => {
  it('normal glucose returns normal status', () => {
    const interp = getMarkerInterpretation('glucose', 90);
    expect(interp.status).toBe('normal');
    expect(interp.score).toBeGreaterThan(80);
  });

  it('high glucose returns high/critical status', () => {
    const interp = getMarkerInterpretation('glucose', 150);
    expect(['high', 'critical']).toContain(interp.status);
    expect(interp.score).toBeLessThan(60);
  });

  it('low glucose returns low status', () => {
    const interp = getMarkerInterpretation('glucose', 50);
    expect(interp.status).toBe('low');
  });

  it('optimal HbA1c returns optimal status', () => {
    const interp = getMarkerInterpretation('hba1c', 5.0);
    expect(interp.status).toBe('optimal');
    expect(interp.score).toBe(100);
  });

  it('pre-diabetic HbA1c returns borderline', () => {
    const interp = getMarkerInterpretation('hba1c', 6.0);
    expect(interp.status).toBe('borderline');
  });

  it('optimal LDL returns optimal', () => {
    const interp = getMarkerInterpretation('ldl', 80);
    expect(interp.status).toBe('optimal');
  });

  it('protective HDL returns optimal', () => {
    const interp = getMarkerInterpretation('hdl', 65);
    expect(interp.status).toBe('optimal');
  });

  it('low HDL returns low status', () => {
    const interp = getMarkerInterpretation('hdl', 30);
    expect(interp.status).toBe('low');
  });

  it('returns unknown for NaN input', () => {
    const interp = getMarkerInterpretation('glucose', NaN);
    expect(interp.status).toBe('unknown');
  });

  it('returns unknown for Infinity input', () => {
    const interp = getMarkerInterpretation('glucose', Infinity);
    expect(interp.status).toBe('unknown');
  });
});

// ── isPlausibleValue ───────────────────────────────────────────────────────
describe('isPlausibleValue', () => {
  it('accepts normal glucose value', () => {
    expect(isPlausibleValue('glucose', 95)).toBe(true);
  });

  it('rejects extremely high glucose', () => {
    expect(isPlausibleValue('glucose', 700)).toBe(false);
  });

  it('rejects negative glucose', () => {
    expect(isPlausibleValue('glucose', -5)).toBe(false);
  });

  it('accepts boundary minimum', () => {
    expect(isPlausibleValue('glucose', 20)).toBe(true);
  });

  it('accepts boundary maximum', () => {
    expect(isPlausibleValue('glucose', 600)).toBe(true);
  });

  it('rejects just below minimum', () => {
    expect(isPlausibleValue('glucose', 19)).toBe(false);
  });

  it('accepts normal creatinine', () => {
    expect(isPlausibleValue('creatinine', 1.0)).toBe(true);
  });

  it('rejects implausible creatinine', () => {
    expect(isPlausibleValue('creatinine', 25)).toBe(false);
  });
});

// ── parseBloodReport ───────────────────────────────────────────────────────
describe('parseBloodReport', () => {
  it('extracts glucose from typical lab format', () => {
    const markers = parseBloodReport('Glucose: 93 mg/dL');
    expect(markers.glucose).toBe(93);
  });

  it('extracts HbA1c with percentage', () => {
    const markers = parseBloodReport('Hemoglobin A1c: 5.4 %');
    expect(markers.hba1c).toBe(5.4);
  });

  it('extracts multiple markers from multi-line text', () => {
    const text = [
      'Glucose: 95 mg/dL',
      'Total Cholesterol: 195 mg/dL',
      'HDL Cholesterol: 55 mg/dL',
      'LDL Cholesterol: 120 mg/dL',
      'Triglycerides: 100 mg/dL',
    ].join('\n');
    const markers = parseBloodReport(text);
    expect(markers.glucose).toBe(95);
    expect(markers.totalCholesterol).toBe(195);
    expect(markers.hdl).toBe(55);
    expect(markers.ldl).toBe(120);
    expect(markers.triglycerides).toBe(100);
  });

  it('handles TSH extraction', () => {
    const markers = parseBloodReport('TSH: 2.1 mIU/L');
    expect(markers.tsh).toBe(2.1);
  });

  it('returns empty object for empty text', () => {
    const markers = parseBloodReport('');
    expect(Object.keys(markers)).toHaveLength(0);
  });

  it('rejects implausible extracted values', () => {
    // Glucose of 5000 is beyond plausible range
    const markers = parseBloodReport('Glucose: 5000 mg/dL');
    expect(markers.glucose).toBeUndefined();
  });

  it('computes non-HDL when TC and HDL present', () => {
    const markers = parseBloodReport(
      'Total Cholesterol: 200 mg/dL\nHDL Cholesterol: 55 mg/dL',
    );
    expect(markers.nonHdl).toBe(145);
  });
});

// ── formatMarkerValue ──────────────────────────────────────────────────────
describe('formatMarkerValue', () => {
  it('formats glucose with unit', () => {
    expect(formatMarkerValue('glucose', 95)).toBe('95 mg/dL');
  });

  it('formats HbA1c with percent', () => {
    expect(formatMarkerValue('hba1c', 5.4)).toBe('5.4 %');
  });
});

// ── getMarkerUnit ──────────────────────────────────────────────────────────
describe('getMarkerUnit', () => {
  it('returns mg/dL for glucose', () => {
    expect(getMarkerUnit('glucose')).toBe('mg/dL');
  });

  it('returns % for hba1c', () => {
    expect(getMarkerUnit('hba1c')).toBe('%');
  });
});

// ── getMarkerTiers ─────────────────────────────────────────────────────────
describe('getMarkerTiers', () => {
  it('returns tiers for glucose', () => {
    const tiers = getMarkerTiers('glucose');
    expect(tiers.length).toBeGreaterThan(0);
    expect(tiers[0]).toHaveProperty('min');
    expect(tiers[0]).toHaveProperty('max');
    expect(tiers[0]).toHaveProperty('status');
  });

  it('returns gender-specific tiers when defined', () => {
    // ferritin has gender-specific ranges
    const maleTiers = getMarkerTiers('ferritin', 'male');
    const femaleTiers = getMarkerTiers('ferritin', 'female');
    expect(maleTiers.length).toBeGreaterThan(0);
    expect(femaleTiers.length).toBeGreaterThan(0);
  });
});
