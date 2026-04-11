import type { BloodMarkers, MarkerDefinition, MarkerInterpretation, MarkerRangeTier, UserProfile } from '@/types';

const VERY_HIGH = 999999;

export const MARKER_RULES: Record<keyof BloodMarkers, MarkerDefinition> = {
  glucose: {
    unit: 'mg/dL',
    universal: [
      { min: 0, max: 69, status: 'low', label: 'Low', score: 35 },
      { min: 70, max: 99, status: 'normal', label: 'Normal', score: 95 },
      { min: 100, max: 125, status: 'borderline', label: 'Pre-diabetes', score: 65 },
      { min: 126, max: 199, status: 'high', label: 'High', score: 40 },
      { min: 200, max: VERY_HIGH, status: 'critical', label: 'Critical', score: 15 },
    ],
  },
  hba1c: {
    unit: '%',
    universal: [
      { min: 0, max: 5.3, status: 'optimal', label: 'Optimal', score: 100 },
      { min: 5.4, max: 5.6, status: 'normal', label: 'Normal', score: 92 },
      { min: 5.7, max: 6.4, status: 'borderline', label: 'Pre-diabetes', score: 60 },
      { min: 6.5, max: 7.4, status: 'high', label: 'High', score: 35 },
      { min: 7.5, max: VERY_HIGH, status: 'critical', label: 'Critical', score: 15 },
    ],
  },
  totalCholesterol: {
    unit: 'mg/dL',
    universal: [
      { min: 0, max: 199, status: 'normal', label: 'Desirable', score: 92 },
      { min: 200, max: 239, status: 'borderline', label: 'Borderline high', score: 65 },
      { min: 240, max: 299, status: 'high', label: 'High', score: 40 },
      { min: 300, max: VERY_HIGH, status: 'critical', label: 'Critical', score: 15 },
    ],
  },
  ldl: {
    unit: 'mg/dL',
    universal: [
      { min: 0, max: 99, status: 'optimal', label: 'Optimal', score: 100 },
      { min: 100, max: 129, status: 'normal', label: 'Near optimal', score: 85 },
      { min: 130, max: 159, status: 'borderline', label: 'Borderline high', score: 60 },
      { min: 160, max: 189, status: 'high', label: 'High', score: 35 },
      { min: 190, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  hdl: {
    unit: 'mg/dL',
    universal: [
      { min: 0, max: 39, status: 'low', label: 'Low', score: 45 },
      { min: 40, max: 59, status: 'normal', label: 'Normal', score: 85 },
      { min: 60, max: VERY_HIGH, status: 'optimal', label: 'Protective', score: 100 },
    ],
  },
  triglycerides: {
    unit: 'mg/dL',
    universal: [
      { min: 0, max: 149, status: 'normal', label: 'Normal', score: 92 },
      { min: 150, max: 199, status: 'borderline', label: 'Borderline high', score: 65 },
      { min: 200, max: 499, status: 'high', label: 'High', score: 35 },
      { min: 500, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  tsh: {
    unit: 'mIU/L',
    universal: [
      { min: 0, max: 0.09, status: 'critical', label: 'Very low', score: 15 },
      { min: 0.1, max: 0.39, status: 'low', label: 'Low', score: 45 },
      { min: 0.4, max: 4, status: 'normal', label: 'Normal', score: 92 },
      { min: 4.01, max: 10, status: 'high', label: 'High', score: 45 },
      { min: 10.01, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  vitaminD: {
    unit: 'ng/mL',
    universal: [
      { min: 0, max: 11, status: 'critical', label: 'Deficient', score: 15 },
      { min: 12, max: 19, status: 'low', label: 'Low', score: 40 },
      { min: 20, max: 29, status: 'borderline', label: 'Insufficient', score: 65 },
      { min: 30, max: 60, status: 'optimal', label: 'Optimal', score: 100 },
      { min: 61, max: 100, status: 'normal', label: 'Normal', score: 90 },
      { min: 101, max: 150, status: 'high', label: 'High', score: 70 },
      { min: 151, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 40 },
    ],
  },
  vitaminB12: {
    unit: 'pg/mL',
    universal: [
      { min: 0, max: 199, status: 'critical', label: 'Very low', score: 15 },
      { min: 200, max: 299, status: 'low', label: 'Low', score: 45 },
      { min: 300, max: 900, status: 'normal', label: 'Normal', score: 92 },
      { min: 901, max: 2000, status: 'high', label: 'High', score: 85 },
      { min: 2001, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 70 },
    ],
  },
  ferritin: {
    unit: 'ng/mL',
    male: [
      { min: 0, max: 14, status: 'critical', label: 'Very low', score: 15 },
      { min: 15, max: 29, status: 'low', label: 'Low', score: 45 },
      { min: 30, max: 300, status: 'normal', label: 'Normal', score: 92 },
      { min: 301, max: 500, status: 'high', label: 'High', score: 70 },
      { min: 501, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 45 },
    ],
    female: [
      { min: 0, max: 9, status: 'critical', label: 'Very low', score: 15 },
      { min: 10, max: 14, status: 'low', label: 'Low', score: 45 },
      { min: 15, max: 150, status: 'normal', label: 'Normal', score: 92 },
      { min: 151, max: 300, status: 'high', label: 'High', score: 70 },
      { min: 301, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 45 },
    ],
  },
  iron: {
    unit: 'mcg/dL',
    universal: [
      { min: 0, max: 39, status: 'critical', label: 'Very low', score: 15 },
      { min: 40, max: 59, status: 'low', label: 'Low', score: 45 },
      { min: 60, max: 170, status: 'normal', label: 'Normal', score: 92 },
      { min: 171, max: 200, status: 'high', label: 'High', score: 75 },
      { min: 201, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 50 },
    ],
  },
  nonHdl: {
    unit: 'mg/dL',
    universal: [
      { min: 0, max: 129, status: 'optimal', label: 'Optimal', score: 100 },
      { min: 130, max: 159, status: 'borderline', label: 'Borderline high', score: 65 },
      { min: 160, max: 189, status: 'high', label: 'High', score: 40 },
      { min: 190, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  apoB: {
    unit: 'mg/dL',
    universal: [
      { min: 0, max: 89, status: 'optimal', label: 'Optimal', score: 100 },
      { min: 90, max: 109, status: 'normal', label: 'Normal', score: 85 },
      { min: 110, max: 129, status: 'borderline', label: 'Borderline high', score: 60 },
      { min: 130, max: 159, status: 'high', label: 'High', score: 35 },
      { min: 160, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  hsCRP: {
    unit: 'mg/L',
    universal: [
      { min: 0, max: 0.99, status: 'optimal', label: 'Low risk', score: 100 },
      { min: 1, max: 2.99, status: 'borderline', label: 'Average risk', score: 70 },
      { min: 3, max: 9.99, status: 'high', label: 'High risk', score: 40 },
      { min: 10, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  alt: {
    unit: 'U/L',
    male: [
      { min: 0, max: 41, status: 'normal', label: 'Normal', score: 92 },
      { min: 42, max: 63, status: 'borderline', label: 'Mildly elevated', score: 65 },
      { min: 64, max: 200, status: 'high', label: 'Elevated', score: 35 },
      { min: 201, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
    female: [
      { min: 0, max: 33, status: 'normal', label: 'Normal', score: 92 },
      { min: 34, max: 55, status: 'borderline', label: 'Mildly elevated', score: 65 },
      { min: 56, max: 200, status: 'high', label: 'Elevated', score: 35 },
      { min: 201, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  ast: {
    unit: 'U/L',
    male: [
      { min: 0, max: 40, status: 'normal', label: 'Normal', score: 92 },
      { min: 41, max: 60, status: 'borderline', label: 'Mildly elevated', score: 65 },
      { min: 61, max: 200, status: 'high', label: 'Elevated', score: 35 },
      { min: 201, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
    female: [
      { min: 0, max: 32, status: 'normal', label: 'Normal', score: 92 },
      { min: 33, max: 50, status: 'borderline', label: 'Mildly elevated', score: 65 },
      { min: 51, max: 200, status: 'high', label: 'Elevated', score: 35 },
      { min: 201, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  albumin: {
    unit: 'g/dL',
    universal: [
      { min: 0, max: 2.9, status: 'critical', label: 'Very low', score: 15 },
      { min: 3.0, max: 3.4, status: 'low', label: 'Low', score: 45 },
      { min: 3.5, max: 5.5, status: 'normal', label: 'Normal', score: 92 },
      { min: 5.6, max: VERY_HIGH, status: 'high', label: 'High', score: 70 },
    ],
  },
  creatinine: {
    unit: 'mg/dL',
    male: [
      { min: 0, max: 0.69, status: 'low', label: 'Low', score: 55 },
      { min: 0.7, max: 1.3, status: 'normal', label: 'Normal', score: 92 },
      { min: 1.31, max: 1.8, status: 'borderline', label: 'Mildly elevated', score: 65 },
      { min: 1.81, max: 3, status: 'high', label: 'Elevated', score: 35 },
      { min: 3.01, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
    female: [
      { min: 0, max: 0.59, status: 'low', label: 'Low', score: 55 },
      { min: 0.6, max: 1.1, status: 'normal', label: 'Normal', score: 92 },
      { min: 1.11, max: 1.5, status: 'borderline', label: 'Mildly elevated', score: 65 },
      { min: 1.51, max: 3, status: 'high', label: 'Elevated', score: 35 },
      { min: 3.01, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
  uricAcid: {
    unit: 'mg/dL',
    male: [
      { min: 0, max: 3.49, status: 'low', label: 'Low', score: 55 },
      { min: 3.5, max: 7.2, status: 'normal', label: 'Normal', score: 92 },
      { min: 7.21, max: 9, status: 'borderline', label: 'Mildly elevated', score: 65 },
      { min: 9.01, max: VERY_HIGH, status: 'high', label: 'High', score: 35 },
    ],
    female: [
      { min: 0, max: 2.59, status: 'low', label: 'Low', score: 55 },
      { min: 2.6, max: 6, status: 'normal', label: 'Normal', score: 92 },
      { min: 6.01, max: 8, status: 'borderline', label: 'Mildly elevated', score: 65 },
      { min: 8.01, max: VERY_HIGH, status: 'high', label: 'High', score: 35 },
    ],
  },
  fastingInsulin: {
    unit: 'mIU/L',
    universal: [
      { min: 0, max: 1.99, status: 'low', label: 'Low', score: 55 },
      { min: 2, max: 6, status: 'optimal', label: 'Optimal', score: 100 },
      { min: 6.01, max: 25, status: 'normal', label: 'Normal', score: 85 },
      { min: 25.01, max: 50, status: 'high', label: 'High', score: 40 },
      { min: 50.01, max: VERY_HIGH, status: 'critical', label: 'Very high', score: 15 },
    ],
  },
};

/**
 * Plausible physiological ranges per marker.
 * Values outside these ranges are likely data-entry errors or unit mismatches
 * (e.g. glucose in mmol/L instead of mg/dL) and should be rejected.
 */
export const PLAUSIBLE_RANGES: Partial<Record<keyof BloodMarkers, { min: number; max: number }>> = {
  glucose: { min: 20, max: 600 },         // mg/dL — 20 is severe hypoglycemia, 600+ is diabetic crisis
  hba1c: { min: 3, max: 20 },             // % — below 3 is extremely rare, above 20 is extreme
  totalCholesterol: { min: 50, max: 500 }, // mg/dL
  ldl: { min: 10, max: 400 },             // mg/dL
  hdl: { min: 5, max: 150 },              // mg/dL — above 150 is extremely rare
  triglycerides: { min: 10, max: 2000 },   // mg/dL — above 2000 is pancreatitis territory
  nonHdl: { min: 10, max: 500 },          // mg/dL — derived (TC − HDL)
  apoB: { min: 10, max: 300 },            // mg/dL
  hsCRP: { min: 0.01, max: 100 },         // mg/L
  tsh: { min: 0.01, max: 100 },           // mIU/L
  vitaminD: { min: 1, max: 200 },         // ng/mL
  vitaminB12: { min: 50, max: 5000 },     // pg/mL
  ferritin: { min: 1, max: 2000 },        // ng/mL
  iron: { min: 5, max: 500 },             // mcg/dL
  alt: { min: 1, max: 1000 },             // U/L
  ast: { min: 1, max: 1000 },             // U/L
  albumin: { min: 1, max: 7 },            // g/dL
  creatinine: { min: 0.1, max: 15 },      // mg/dL
  uricAcid: { min: 0.5, max: 20 },        // mg/dL
  fastingInsulin: { min: 0.1, max: 300 },  // mIU/L
};

/** Returns true if the value is within the plausible physiological range for the marker. */
export function isPlausibleValue(marker: keyof BloodMarkers, value: number): boolean {
  const range = PLAUSIBLE_RANGES[marker];
  if (!range) return true; // No range defined — accept
  return value >= range.min && value <= range.max;
}

export function parseBloodReport(text: string): BloodMarkers {
  const markers: BloodMarkers = {};
  const normalizedText = text.replace(/\u2013|\u2014/g, '-');

  const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /**
   * Generic lab-agnostic value extractor.
   *
   * This is a FALLBACK parser — the primary extraction is done by the LLM.
   * It handles common lab report formats from any provider:
   *   - "Glucose: 93 mg/dL"
   *   - "Glucose  93  mg/dL  (70-100)"
   *   - "Glucose .............. 93 mg/dL"
   *   - "93 mg/dL" near the marker name
   *   - "93 High" or "15.3 Low" flag patterns
   *
   * It does NOT try to handle provider-specific concatenated column formats
   * (e.g. Labcorp "131706/26/2024") — that complexity is left to the LLM.
   */
  const extractValue = (
    aliases: string[],
    units: string[],
  ): number | undefined => {
    for (const alias of aliases) {
      const aliasRe = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'ig');
      let m: RegExpExecArray | null;
      while ((m = aliasRe.exec(normalizedText)) !== null) {
        const from = m.index;

        // ── Context guards: skip non-result matches ──
        // Look at surrounding context to reject matches in headers, footnotes, disclaimers
        const lineStart = normalizedText.lastIndexOf('\n', from) + 1;
        const contextBefore = normalizedText.slice(Math.max(0, lineStart), from);
        const contextAfter = normalizedText.slice(from, Math.min(normalizedText.length, from + 300));

        // Skip matches in order lists, footnotes, disclaimers, educational text
        if (/ordered items|test\s+name|previous\s+reference/i.test(contextBefore)) continue;
        if (/deficien|insufficien|guideline|institute|society|recommend|less\s+than|greater\s+than|between/i.test(
          contextAfter.slice(0, 100)
        )) continue;

        const afterAlias = contextAfter.slice(m[0].length);

        // Strategy 1: "value flag" pattern — number followed by High/Low/Normal/Critical/Abnormal
        // e.g. "15.3 Low", "22 High", "93 Normal"
        const flagMatch = afterAlias.match(/^[\s.:]*(\d+(?:\.\d+)?)\s*(?:High|Low|Normal|Critical|Abnormal|H|L|A)\b/i);
        if (flagMatch) {
          const value = Number.parseFloat(flagMatch[1]);
          if (Number.isFinite(value) && value > 0) return value;
        }

        // Strategy 2: "value unit" pattern — number followed by a known unit
        // e.g. "93 mg/dL", "5.2 %", "1.18 mg/dL"
        const unitPattern = units.map((u) => escapeRegex(u)).join('|');
        const unitMatch = new RegExp(
          `[\\s.:]+?(\\d+(?:\\.\\d+)?)\\s*(?:${unitPattern})\\b`,
          'i',
        ).exec(afterAlias);
        if (unitMatch) {
          const value = Number.parseFloat(unitMatch[1]);
          if (Number.isFinite(value) && value > 0) return value;
        }

        // Strategy 3: colon/space then number pattern (generic)
        // e.g. "Glucose: 93", "Glucose   93", "Glucose......93"
        // Only grab standalone numbers (followed by space, unit, end-of-line, or flag)
        const simpleMatch = afterAlias.match(
          /^[\s.:·…]+(\d+(?:\.\d+)?)\s*(?:$|\s|[a-zA-Z/%])/,
        );
        if (simpleMatch) {
          const value = Number.parseFloat(simpleMatch[1]);
          if (Number.isFinite(value) && value > 0) return value;
        }
      }
    }
    return undefined;
  };

  // ── Marker extraction ──
  // Each uses extractValue — a generic, lab-agnostic extractor.
  // This is the fallback parser; the LLM handles complex/unusual layouts.

  /** Accept extracted value only if it passes the plausible range check. */
  const accept = (key: keyof BloodMarkers, value: number | undefined) => {
    if (value !== undefined && isPlausibleValue(key, value)) {
      markers[key] = value;
    }
  };

  accept('glucose', extractValue(['fasting glucose', 'glucose'], ['mg/dL', 'mg/dl']));
  accept('hba1c', extractValue(['hemoglobin a1c', 'hba1c', 'a1c'], ['%']));
  accept('totalCholesterol', extractValue(['total cholesterol', 'cholesterol, total'], ['mg/dL', 'mg/dl']));
  accept('ldl', extractValue(['ldl cholesterol', 'ldl-c', 'ldl', 'low density lipoprotein'], ['mg/dL', 'mg/dl']));
  accept('hdl', extractValue(['hdl cholesterol', 'hdl-c', 'hdl', 'high density lipoprotein'], ['mg/dL', 'mg/dl']));
  accept('triglycerides', extractValue(['triglycerides', 'triglyceride'], ['mg/dL', 'mg/dl']));
  accept('apoB', extractValue(['apo b', 'apolipoprotein b', 'apob'], ['mg/dL', 'mg/dl']));
  accept('hsCRP', extractValue(['hs-crp', 'high sensitivity c-reactive protein', 'c-reactive protein', 'hscrp'], ['mg/L', 'mg/l']));
  accept('tsh', extractValue(['tsh', 'thyroid stimulating hormone'], ['mIU/L', 'uIU/mL', 'miu/l']));
  accept('vitaminD', extractValue(['vitamin d, 25-hydroxy', 'vitamin d 25-hydroxy', '25-hydroxy vitamin d', 'vitamin d'], ['ng/mL', 'ng/ml']));
  accept('vitaminB12', extractValue(['vitamin b12', 'vitamin b-12', 'cobalamin'], ['pg/mL', 'pg/ml', 'pmol/L']));
  accept('ferritin', extractValue(['ferritin'], ['ng/mL', 'ng/ml', 'ug/L']));
  accept('iron', extractValue(['serum iron', 'iron, total', 'iron'], ['mcg/dL', 'ug/dL', 'umol/L']));
  // ALT — search for the specific "ALT (SGPT)" first to avoid matching "Alternate"
  accept('alt', extractValue(['alt (sgpt)', 'sgpt', 'alanine aminotransferase', 'alanine transferase', 'alt'], ['U/L', 'IU/L', 'u/l']));
  // AST — search for the specific "AST (SGOT)" first
  accept('ast', extractValue(['ast (sgot)', 'sgot', 'aspartate aminotransferase', 'aspartate transferase', 'ast'], ['U/L', 'IU/L', 'u/l']));
  accept('albumin', extractValue(['albumin'], ['g/dL', 'g/dl']));
  accept('creatinine', extractValue(['creatinine'], ['mg/dL', 'mg/dl']));
  accept('uricAcid', extractValue(['uric acid', 'urate'], ['mg/dL', 'mg/dl']));
  accept('fastingInsulin', extractValue(['fasting insulin', 'insulin'], ['mIU/L', 'uIU/mL', 'miu/l']));

  // Derived markers — only compute nonHdl if HDL <= Total Cholesterol (sanity check)
  if (markers.totalCholesterol !== undefined && markers.hdl !== undefined && markers.hdl <= markers.totalCholesterol) {
    const nonHdl = markers.totalCholesterol - markers.hdl;
    if (Number.isFinite(nonHdl) && nonHdl >= 0) {
      markers.nonHdl = Math.round(nonHdl);
    }
  }

  return markers;
}

export function getMarkerInterpretation(
  marker: keyof BloodMarkers,
  value: number,
  gender?: UserProfile['gender'],
): MarkerInterpretation {
  const def = MARKER_RULES[marker];
  const tiers = getMarkerTiers(marker, gender);

  // SAFE FALLBACK: missing rules/tiers or invalid value should not trigger "Critical".
  // Score 25 matches the out-of-range fallback below for consistency.
  if (!def || !tiers || tiers.length === 0 || !Number.isFinite(value)) {
    return { status: 'unknown', label: 'Unmapped', score: 25 };
  }

  // Match using >= min and < next tier's min (or <= max for the last tier).
  // This closes gaps between tiers where decimals like 69.5 would otherwise be unmapped.
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  const tier = sorted.find((t, i) => {
    const nextMin = sorted[i + 1]?.min;
    return value >= t.min && (nextMin !== undefined ? value < nextMin : value <= t.max);
  });
  if (tier) return { status: tier.status, label: tier.label, score: tier.score };

  // Out-of-bounds fallback — value fell between tier gaps (e.g. decimal like
  // 69.5 between 0-69 and 70-99) or is negative. Use neutral 'unknown' status
  // since the direction (high vs low) can't be determined.
  return { status: 'unknown', label: 'Out of Range', score: 25 };
}

export function formatMarkerValue(marker: keyof BloodMarkers, value: number): string {
  const unit = MARKER_RULES[marker]?.unit;
  if (!unit) return `${value}`;
  return `${value} ${unit}`;
}

export function getMarkerTiers(
  marker: keyof BloodMarkers,
  gender?: UserProfile['gender'],
): MarkerRangeTier[] {
  const def = MARKER_RULES[marker];
  if (!def) return [];

  const preferred =
    gender === 'male' ? def.male :
    gender === 'female' ? def.female :
    undefined;

  return preferred ?? def.universal ?? [];
}

export function getMarkerUnit(marker: keyof BloodMarkers): string | undefined {
  return MARKER_RULES[marker]?.unit;
}

export function getMarkerReferenceTier(
  marker: keyof BloodMarkers,
  gender?: UserProfile['gender'],
): MarkerRangeTier | undefined {
  const tiers = getMarkerTiers(marker, gender);
  return tiers.find((t) => t.status === 'optimal') ?? tiers.find((t) => t.status === 'normal');
}

export function getMarkerDisplayRange(
  marker: keyof BloodMarkers,
  gender?: UserProfile['gender'],
): { min: number; max: number; unit: string; maxLabel: string } | null {
  const unit = getMarkerUnit(marker);
  const ref = getMarkerReferenceTier(marker, gender);
  if (!unit || !ref) return null;

  const maxLabel = ref.max >= VERY_HIGH ? `${ref.min}+` : `${ref.max}`;
  return { min: ref.min, max: ref.max, unit, maxLabel };
}

/** Value axis for the biomarker range bar — keep in sync with tier segment layout on the dashboard. */
export function getMarkerBarScale(
  marker: keyof BloodMarkers,
  gender?: UserProfile['gender'],
): { visualMin: number; visualMax: number } | null {
  const reference = getMarkerDisplayRange(marker, gender);
  if (!reference) return null;

  const tiers = getMarkerTiers(marker, gender);
  if (tiers.length === 0) {
    const visualMin = Math.max(0, reference.min * 0.5);
    const visualMax = reference.max * 1.5;
    return { visualMin, visualMax };
  }

  const highestFiniteMax = tiers
    .map((tier) => tier.max)
    .filter((max) => Number.isFinite(max) && max < 9999)
    .reduce((current, max) => Math.max(current, max), reference.max);
  const visualMin = Math.max(0, Math.min(reference.min, tiers[0]?.min ?? reference.min));
  const visualMax = Math.max(reference.max * 1.2, highestFiniteMax);
  return { visualMin, visualMax };
}

export function markerValueToBarPercent(
  value: number,
  scale: { visualMin: number; visualMax: number },
): number {
  const span = Math.max(1e-9, scale.visualMax - scale.visualMin);
  const pct = ((value - scale.visualMin) / span) * 100;
  return Math.max(2, Math.min(98, pct));
}
