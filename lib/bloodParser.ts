import { BloodMarkers } from '@/types';

// Reference ranges for common blood markers
export const REFERENCE_RANGES: Record<keyof BloodMarkers, { min: number; max: number; unit: string }> = {
  glucose: { min: 70, max: 99, unit: 'mg/dL' },
  hba1c: { min: 4.0, max: 5.6, unit: '%' },
  totalCholesterol: { min: 0, max: 199, unit: 'mg/dL' },
  ldl: { min: 0, max: 99, unit: 'mg/dL' },
  hdl: { min: 40, max: 200, unit: 'mg/dL' },
  triglycerides: { min: 0, max: 149, unit: 'mg/dL' },
  tsh: { min: 0.5, max: 4.0, unit: 'mIU/L' },
  vitaminD: { min: 30, max: 100, unit: 'ng/mL' },
  vitaminB12: { min: 300, max: 900, unit: 'pg/mL' },
  ferritin: { min: 30, max: 300, unit: 'ng/mL' },
  iron: { min: 60, max: 170, unit: 'mcg/dL' },
};

export function parseBloodReport(text: string): BloodMarkers {
  const markers: BloodMarkers = {};
  const normalizedText = text.toLowerCase();

  // Glucose patterns
  const glucoseMatch = text.match(/glucose.*?[:\s]+(\d+\.?\d*)/i) || 
                      text.match(/fasting.*?glucose.*?[:\s]+(\d+\.?\d*)/i);
  if (glucoseMatch) markers.glucose = parseFloat(glucoseMatch[1]);

  // HbA1c patterns
  const hba1cMatch = text.match(/hba1c.*?[:\s]+(\d+\.?\d*)/i) || 
                     text.match(/hemoglobin a1c.*?[:\s]+(\d+\.?\d*)/i) ||
                     text.match(/a1c.*?[:\s]+(\d+\.?\d*)/i);
  if (hba1cMatch) markers.hba1c = parseFloat(hba1cMatch[1]);

  // Cholesterol patterns
  const totalCholMatch = text.match(/total cholesterol.*?[:\s]+(\d+\.?\d*)/i) ||
                         text.match(/cholesterol, total.*?[:\s]+(\d+\.?\d*)/i);
  if (totalCholMatch) markers.totalCholesterol = parseFloat(totalCholMatch[1]);

  // LDL patterns
  const ldlMatch = text.match(/ldl.*?[:\s]+(\d+\.?\d*)/i) ||
                 text.match(/ldl cholesterol.*?[:\s]+(\d+\.?\d*)/i) ||
                 text.match(/low density lipoprotein.*?[:\s]+(\d+\.?\d*)/i);
  if (ldlMatch) markers.ldl = parseFloat(ldlMatch[1]);

  // HDL patterns
  const hdlMatch = text.match(/hdl.*?[:\s]+(\d+\.?\d*)/i) ||
                 text.match(/hdl cholesterol.*?[:\s]+(\d+\.?\d*)/i) ||
                 text.match(/high density lipoprotein.*?[:\s]+(\d+\.?\d*)/i);
  if (hdlMatch) markers.hdl = parseFloat(hdlMatch[1]);

  // Triglycerides patterns
  const trigMatch = text.match(/triglycerides.*?[:\s]+(\d+\.?\d*)/i);
  if (trigMatch) markers.triglycerides = parseFloat(trigMatch[1]);

  // TSH patterns
  const tshMatch = text.match(/tsh.*?[:\s]+(\d+\.?\d*)/i) ||
                 text.match(/thyroid stimulating hormone.*?[:\s]+(\d+\.?\d*)/i);
  if (tshMatch) markers.tsh = parseFloat(tshMatch[1]);

  // Vitamin D patterns
  const vitDMatch = text.match(/vitamin d.*?[:\s]+(\d+\.?\d*)/i) ||
                    text.match(/25[\-\s]?hydroxy.*?vitamin d.*?[:\s]+(\d+\.?\d*)/i) ||
                    text.match(/25\(oh\)d.*?[:\s]+(\d+\.?\d*)/i);
  if (vitDMatch) markers.vitaminD = parseFloat(vitDMatch[1]);

  // Vitamin B12 patterns
  const b12Match = text.match(/vitamin b12.*?[:\s]+(\d+\.?\d*)/i) ||
                   text.match(/b12.*?[:\s]+(\d+\.?\d*)/i) ||
                   text.match(/cobalamin.*?[:\s]+(\d+\.?\d*)/i);
  if (b12Match) markers.vitaminB12 = parseFloat(b12Match[1]);

  // Ferritin patterns
  const ferritinMatch = text.match(/ferritin.*?[:\s]+(\d+\.?\d*)/i);
  if (ferritinMatch) markers.ferritin = parseFloat(ferritinMatch[1]);

  // Iron patterns
  const ironMatch = text.match(/iron[^a-z]*?[:\s]+(\d+\.?\d*)/i) ||
                  text.match(/serum iron.*?[:\s]+(\d+\.?\d*)/i);
  if (ironMatch) markers.iron = parseFloat(ironMatch[1]);

  return markers;
}

export function getMarkerStatus(marker: keyof BloodMarkers, value: number): 'normal' | 'low' | 'high' | 'critical' {
  const range = REFERENCE_RANGES[marker];
  if (!range) return 'normal';

  if (value < range.min * 0.7 || value > range.max * 1.5) return 'critical';
  if (value < range.min || value > range.max) return value < range.min ? 'low' : 'high';
  return 'normal';
}

export function formatMarkerValue(marker: keyof BloodMarkers, value: number): string {
  const range = REFERENCE_RANGES[marker];
  if (!range) return `${value}`;
  return `${value} ${range.unit}`;
}
