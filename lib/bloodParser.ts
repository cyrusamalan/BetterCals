import type { BloodMarkers, MarkerDefinition, MarkerInterpretation, MarkerRangeTier, UserProfile } from '@/types';

const VERY_HIGH = 999999;

export const MARKER_RULES: Record<keyof BloodMarkers, MarkerDefinition> = {
  glucose: {
    unit: 'mg/dL',
    universal: [
      { min: 0, max: 69, status: 'low', label: 'Low', score: 55 },
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

export function parseBloodReport(text: string): BloodMarkers {
  const markers: BloodMarkers = {};
  const normalizedText = text.replace(/\u2013|\u2014/g, '-');

  const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /**
   * Labcorp-style tables often look like:
   *   Glucose 01 93 93 06/26/2024 mg/dL 70-99
   * where the first numeric token after the marker label is a "flag/index" (often `01`),
   * and the "current result" is the next numeric value.
   *
   * OCR/PDF extraction can also split these tokens across lines/pages, so we intentionally
   * avoid "same-line" extraction and instead capture `flag` then `current` across whitespace.
   */
  const extractFlagThenCurrent = (re: RegExp): number | undefined => {
    const match = re.exec(normalizedText);
    if (!match) return undefined;
    // Expected capture groups: (1)=flag, (2)=current result.
    const raw = match[2] ?? match[1];
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  /**
   * Generic fallback for report formats where each marker row has a single result value, e.g.:
   *   ALT 22 U/L 0-41 Healthy
   */
  const extractFirstValueAfterLabel = (lineRegex: RegExp, markerLabelRegex: RegExp): number | undefined => {
    const match = lineRegex.exec(normalizedText);
    if (!match) return undefined;
    const line = match[0];
    const afterLabel = line.replace(markerLabelRegex, ' ');
    const valueMatch = afterLabel.match(/-?\d+(?:\.\d+)?/);
    if (!valueMatch) return undefined;
    const value = Number.parseFloat(valueMatch[0]);
    return Number.isFinite(value) ? value : undefined;
  };

  /**
   * Format-agnostic extraction:
   * 1) Locate marker alias
   * 2) Prefer number closest to expected unit (e.g. `93 mg/dL`)
   * 3) Fallback to Labcorp flag/current shape (`01 93`)
   * 4) Final fallback: first plausible number after label
   */
  const extractMarkerValue = (
    aliases: string[],
    units: string[],
  ): number | undefined => {
    for (const alias of aliases) {
      const aliasRe = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'ig');
      let m: RegExpExecArray | null;
      while ((m = aliasRe.exec(normalizedText)) !== null) {
        const from = m.index;
        const snippet = normalizedText.slice(from, from + 220);
        const afterAlias = snippet.slice(m[0].length);

        // 1) Prefer value right before expected unit.
        const unitPattern = units.map((u) => escapeRegex(u)).join('|');
        const byUnit = new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(?:${unitPattern})\\b`, 'i').exec(afterAlias);
        if (byUnit) {
          const value = Number.parseFloat(byUnit[1]);
          if (Number.isFinite(value)) return value;
        }

        // 2) Labcorp flag/current style: "01 93"
        const flagCurrent = /(?:^|\D)(\d{1,3})\s+(\d+(?:\.\d+)?)/.exec(afterAlias);
        if (flagCurrent) {
          const current = Number.parseFloat(flagCurrent[2]);
          if (Number.isFinite(current)) return current;
        }

        // 3) First plausible number after marker.
        const nums = afterAlias.match(/-?\d+(?:\.\d+)?/g);
        if (nums && nums.length > 0) {
          const first = Number.parseFloat(nums[0]);
          const second = nums.length > 1 ? Number.parseFloat(nums[1]) : undefined;
          // If the first number is likely a flag/index (e.g. 01), use the next one.
          const candidate = Number.isFinite(second) && first <= 2 ? second : first;
          if (Number.isFinite(candidate)) return candidate;
        }
      }
    }
    return undefined;
  };

  // Glucose patterns
  const glucose =
    extractMarkerValue(['fasting glucose', 'glucose'], ['mg/dL']) ??
    extractFlagThenCurrent(/\bglucose\b[^\d]{0,20}(\d{1,3})\s+(\d+(?:\.\d+)?)/i);
  if (glucose !== undefined) markers.glucose = glucose;

  // HbA1c patterns
  const hba1c =
    extractMarkerValue(['hemoglobin a1c', 'hba1c', 'a1c'], ['%']) ??
    extractFlagThenCurrent(/\b(?:hba1c|hemoglobin\s*a\s*1c)\b[^\d]{0,30}(\d{1,3})\s+(\d+(?:\.\d+)?)/i);
  if (hba1c !== undefined) markers.hba1c = hba1c;

  // Cholesterol patterns
  const totalCholMatch = /total cholesterol.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                         /cholesterol, total.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (totalCholMatch) markers.totalCholesterol = Number.parseFloat(totalCholMatch[1]);

  // LDL patterns
  const ldlMatch = /ldl.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                 /ldl cholesterol.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                 /low density lipoprotein.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (ldlMatch) markers.ldl = Number.parseFloat(ldlMatch[1]);

  // HDL patterns
  const hdlMatch = /hdl.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                 /hdl cholesterol.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                 /high density lipoprotein.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (hdlMatch) markers.hdl = Number.parseFloat(hdlMatch[1]);

  // ApoB patterns
  const apoBMatch =
    /apo\s*[-]?\s*b\b.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
    /apolipoprotein\s*b\b.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
    /\bapob\b.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (apoBMatch) markers.apoB = Number.parseFloat(apoBMatch[1]);

  // hs-CRP patterns
  const hsCrpMatch =
    /\bhs[\s-]*crp\b.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
    /\bhigh[\s-]*sensitivity[\s-]*c[\s-]*reactive\s*protein\b.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
    /\bc[\s-]*reactive\s*protein\b.*?\bhigh[\s-]*sensitivity\b.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (hsCrpMatch) markers.hsCRP = Number.parseFloat(hsCrpMatch[1]);

  // Triglycerides patterns
  const trigMatch = /triglycerides.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (trigMatch) markers.triglycerides = Number.parseFloat(trigMatch[1]);

  // TSH patterns
  const tshMatch = /tsh.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                 /thyroid stimulating hormone.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (tshMatch) markers.tsh = Number.parseFloat(tshMatch[1]);

  // Vitamin D patterns
  const vitD =
    extractMarkerValue(['vitamin d, 25-hydroxy', 'vitamin d 25-hydroxy', 'vitamin d'], ['ng/mL']) ??
    extractFlagThenCurrent(/vitamin\s*d[\s\S]{0,50}?25[\-\s]?hydroxy\b[^\d]{0,30}(\d{1,3})\s+(\d+(?:\.\d+)?)/i);
  if (vitD !== undefined) markers.vitaminD = vitD;

  // Vitamin B12 patterns
  const b12Match = /vitamin b12.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                   /b12.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                   /cobalamin.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (b12Match) markers.vitaminB12 = Number.parseFloat(b12Match[1]);

  // Ferritin patterns
  const ferritinMatch = /ferritin.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (ferritinMatch) markers.ferritin = Number.parseFloat(ferritinMatch[1]);

  // Iron patterns
  const ironMatch = /iron[^a-z]*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                  /serum iron.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (ironMatch) markers.iron = Number.parseFloat(ironMatch[1]);

  // ALT patterns
  const alt =
    extractMarkerValue(['alt', 'alt (sgpt)', 'sgpt', 'alanine transferase'], ['U/L', 'IU/L']) ??
    extractFlagThenCurrent(/\balt\b[^\d]{0,25}(\d{1,3})\s+(\d+(?:\.\d+)?)/i);
  if (alt !== undefined) markers.alt = alt;

  // AST patterns
  const ast =
    extractMarkerValue(['ast', 'ast (sgot)', 'sgot', 'aspartate transferase'], ['U/L', 'IU/L']) ??
    extractFlagThenCurrent(/\bast\b[^\d]{0,25}(\d{1,3})\s+(\d+(?:\.\d+)?)/i);
  if (ast !== undefined) markers.ast = ast;

  // Albumin patterns
  const albumin =
    extractMarkerValue(['albumin'], ['g/dL']) ??
    extractFlagThenCurrent(/\balbumin\b[^\d]{0,25}(\d{1,3})\s+(\d+(?:\.\d+)?)/i);
  if (albumin !== undefined) markers.albumin = albumin;

  // Creatinine patterns
  const creatinine =
    extractMarkerValue(['creatinine'], ['mg/dL']) ??
    extractFlagThenCurrent(/\bcreatinine\b[^\d]{0,25}(\d{1,3})\s+(\d+(?:\.\d+)?)/i);
  if (creatinine !== undefined) markers.creatinine = creatinine;

  // Uric Acid patterns
  const uricAcidMatch = /uric\s*acid.*?[:\s]+(\d+\.?\d*)/i.exec(text) ||
                         /urate.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (uricAcidMatch) markers.uricAcid = Number.parseFloat(uricAcidMatch[1]);

  // Fasting Insulin patterns
  const insulinMatch = /(?:fasting\s+)?insulin.*?[:\s]+(\d+\.?\d*)/i.exec(text);
  if (insulinMatch) markers.fastingInsulin = Number.parseFloat(insulinMatch[1]);

  // Derived markers
  if (markers.totalCholesterol !== undefined && markers.hdl !== undefined) {
    const nonHdl = markers.totalCholesterol - markers.hdl;
    if (Number.isFinite(nonHdl)) {
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

  // SAFE FALLBACK: missing rules/tiers or invalid value should not trigger "Critical"
  if (!def || !tiers || tiers.length === 0 || !Number.isFinite(value)) {
    return { status: 'unknown', label: 'Unmapped', score: 50 };
  }

  const tier = tiers.find((t) => value >= t.min && value <= t.max);
  if (tier) return { status: tier.status, label: tier.label, score: tier.score };

  // Out-of-bounds fallback
  return { status: 'critical', label: 'Out of Range', score: 0 };
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
