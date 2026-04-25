import { describe, it, expect } from 'vitest';
import { calculatePhenoAge } from '@/lib/phenoAge';
import type { BloodMarkers, UserProfile } from '@/types';

const baseProfile: UserProfile = {
  age: 45,
  gender: 'male',
  weightLbs: 180,
  heightFeet: 5,
  heightInches: 10,
  activityLevel: 'moderate',
  goal: 'maintain',
};

// Healthy reference panel — should produce a phenoAge near or below chronological age.
const healthyMarkers: BloodMarkers = {
  albumin: 4.7,            // g/dL
  creatinine: 0.95,        // mg/dL
  glucose: 88,             // mg/dL
  hsCRP: 0.4,              // mg/L
  lymphocytePct: 32,       // %
  mcv: 89,                 // fL
  rdw: 12.5,               // %
  alkalinePhosphatase: 70, // U/L
  whiteBloodCells: 5.5,    // K/µL
};

// Stressed panel — chronic inflammation, elevated RDW, low lymphocytes.
const stressedMarkers: BloodMarkers = {
  albumin: 3.8,
  creatinine: 1.15,
  glucose: 115,
  hsCRP: 6.0,
  lymphocytePct: 18,
  mcv: 96,
  rdw: 16.2,
  alkalinePhosphatase: 130,
  whiteBloodCells: 9.5,
};

describe('calculatePhenoAge', () => {
  it('returns a finite, sensible age for a complete healthy panel', () => {
    const r = calculatePhenoAge(baseProfile, healthyMarkers);
    expect(r).not.toBeNull();
    expect(r!.phenoAge).toBeGreaterThan(18);
    expect(r!.phenoAge).toBeLessThan(120);
    expect(r!.usedEstimates).toBe(false);
    expect(r!.missingMarkers).toHaveLength(0);
    expect(r!.mortalityScore).toBeGreaterThan(0);
    expect(r!.mortalityScore).toBeLessThan(1);
  });

  it('healthy panel yields lower phenoAge than stressed panel', () => {
    const healthy = calculatePhenoAge(baseProfile, healthyMarkers);
    const stressed = calculatePhenoAge(baseProfile, stressedMarkers);
    expect(healthy!.phenoAge).toBeLessThan(stressed!.phenoAge);
    expect(healthy!.delta).toBeLessThan(stressed!.delta);
  });

  it('delta = phenoAge - chronologicalAge', () => {
    const r = calculatePhenoAge(baseProfile, healthyMarkers);
    expect(r!.delta).toBeCloseTo(r!.phenoAge - r!.chronologicalAge, 1);
  });

  it('returns null when a critical marker (CRP) is missing', () => {
    const { hsCRP: _hsCRP, ...rest } = healthyMarkers;
    void _hsCRP;
    expect(calculatePhenoAge(baseProfile, rest)).toBeNull();
  });

  it('returns null when a critical marker (RDW) is missing', () => {
    const { rdw: _rdw, ...rest } = healthyMarkers;
    void _rdw;
    expect(calculatePhenoAge(baseProfile, rest)).toBeNull();
  });

  it('fills albumin from population average when allowEstimates=true', () => {
    const { albumin: _albumin, ...rest } = healthyMarkers;
    void _albumin;
    const r = calculatePhenoAge(baseProfile, rest);
    expect(r).not.toBeNull();
    expect(r!.usedEstimates).toBe(true);
    expect(r!.missingMarkers).toContain('albumin');
  });

  it('refuses to fill from averages when allowEstimates=false', () => {
    const { albumin: _albumin, ...rest } = healthyMarkers;
    void _albumin;
    expect(calculatePhenoAge(baseProfile, rest, { allowEstimates: false })).toBeNull();
  });

  it('rejects implausible profile age', () => {
    const r = calculatePhenoAge({ ...baseProfile, age: 5 }, healthyMarkers);
    expect(r).toBeNull();
  });

  it('handles very-low CRP without producing -Infinity (ln floor applied)', () => {
    // 0.05 mg/L → 0.005 mg/dL, below the internal CRP_FLOOR_MGDL of 0.01.
    const r = calculatePhenoAge(baseProfile, { ...healthyMarkers, hsCRP: 0.05 });
    expect(r).not.toBeNull();
    expect(Number.isFinite(r!.phenoAge)).toBe(true);
  });

  it('older chronological age propagates into phenoAge', () => {
    const young = calculatePhenoAge({ ...baseProfile, age: 30 }, healthyMarkers);
    const old = calculatePhenoAge({ ...baseProfile, age: 70 }, healthyMarkers);
    expect(old!.phenoAge).toBeGreaterThan(young!.phenoAge);
  });
});
