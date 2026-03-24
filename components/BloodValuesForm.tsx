'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BloodMarkers } from '@/types';
import { MARKER_FIELDS } from '@/lib/markerMetadata';
import { ArrowRight, Info, TrendingUp, TrendingDown } from 'lucide-react';

// #region debug log helper
const DEBUG_ENDPOINT = 'http://127.0.0.1:7498/ingest/6f0bd25c-93a7-48e3-a88d-41621d1baedd';
const DEBUG_SESSION_ID = 'dc8eb7';
function debugLog({
  hypothesisId,
  location,
  message,
  data,
}: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  try {
    fetch(DEBUG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        location,
        message,
        hypothesisId,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}
// #endregion

interface BloodValuesFormProps {
  onSubmit: (markers: BloodMarkers) => void;
  initialValues?: BloodMarkers;
}

// Marker field metadata is centralized in `lib/markerMetadata.ts`.
const FIELDS = MARKER_FIELDS;

/*
const FIELDS: {
  key: keyof BloodMarkers;
  label: string;
  unit: string;
  placeholder: string;
  hint: string;
  description: string;
  optimalRange: string;
  affects: string;
  foods: string;
  retest: string;
  step?: string;
  category: string;
}[] = [
  { 
    key: 'glucose', 
    label: 'Fasting Glucose', 
    unit: 'mg/dL', 
    placeholder: '90', 
    hint: '70–99', 
    description: 'Blood sugar level after fasting. Core metabolic marker.',
    optimalRange: '70–99 mg/dL',
    affects: 'Refined carbs, sleep quality, stress, and activity level.',
    foods: 'Beans, lentils, oats, leafy greens, and protein-forward meals.',
    retest: '8-12 weeks after nutrition and training changes.',
    category: 'Metabolic', 
    step: '0.1' 
  },
  { 
    key: 'hba1c', 
    label: 'HbA1c', 
    unit: '%', 
    placeholder: '5.4', 
    hint: '4.0–5.6', 
    description: '3-month average blood glucose. Indicates diabetes risk.',
    optimalRange: '4.0–5.6%',
    affects: 'Long-term carb intake, exercise consistency, sleep, and stress.',
    foods: 'High-fiber carbs, legumes, vegetables, and lean proteins.',
    retest: 'Every ~3 months (reflects red blood cell lifespan).',
    category: 'Metabolic', 
    step: '0.1' 
  },
  { 
    key: 'totalCholesterol', 
    label: 'Total Cholesterol', 
    unit: 'mg/dL', 
    placeholder: '180', 
    hint: '<200', 
    description: 'Combined HDL, LDL, and triglycerides. Key cardiovascular marker.',
    optimalRange: '<200 mg/dL',
    affects: 'Fat quality, fiber intake, genetics, activity, and body weight.',
    foods: 'Oats, beans, nuts, olive oil, fatty fish, and vegetables.',
    retest: '8-12 weeks after diet/lifestyle adjustments.',
    category: 'Cardiovascular' 
  },
  { 
    key: 'ldl', 
    label: 'LDL (Bad Cholesterol)', 
    unit: 'mg/dL', 
    placeholder: '100', 
    hint: '<100', 
    description: 'Low-density lipoprotein. Raises heart disease risk at high levels.',
    optimalRange: '<100 mg/dL (optimal)',
    affects: 'Saturated/trans fats, soluble fiber intake, body fat, exercise.',
    foods: 'Oats, barley, psyllium, legumes, fish, and unsalted nuts.',
    retest: '8-12 weeks after targeted nutrition changes.',
    category: 'Cardiovascular' 
  },
  { 
    key: 'hdl', 
    label: 'HDL (Good Cholesterol)', 
    unit: 'mg/dL', 
    placeholder: '60', 
    hint: '>60', 
    description: 'High-density lipoprotein. Protective against heart disease.',
    optimalRange: '>60 mg/dL (protective)',
    affects: 'Aerobic training, smoking, body composition, and triglycerides.',
    foods: 'Fatty fish, olive oil, nuts, seeds, and whole-food fats.',
    retest: '8-12 weeks after routine/activity changes.',
    category: 'Cardiovascular' 
  },
  { 
    key: 'triglycerides', 
    label: 'Triglycerides', 
    unit: 'mg/dL', 
    placeholder: '120', 
    hint: '<150', 
    description: 'Fat in blood. Elevated levels linked to heart disease risk.',
    optimalRange: '<150 mg/dL',
    affects: 'Refined carbs/sugar, alcohol, insulin resistance, and inactivity.',
    foods: 'Fish, high-fiber carbs, legumes, vegetables, and fewer added sugars.',
    retest: '6-10 weeks after carb quality improvements.',
    category: 'Cardiovascular' 
  },
  { 
    key: 'tsh', 
    label: 'TSH', 
    unit: 'mIU/L', 
    placeholder: '2.0', 
    hint: '0.5–4.0', 
    description: 'Thyroid-stimulating hormone. Regulates metabolism and energy.',
    optimalRange: '0.5–4.0 mIU/L',
    affects: 'Sleep, stress, iodine/selenium status, illness, and medications.',
    foods: 'Seafood, eggs, dairy, brazil nuts, and adequate protein.',
    retest: '6-12 weeks after therapy or major lifestyle changes.',
    category: 'Hormonal', 
    step: '0.01' 
  },
  { 
    key: 'vitaminD', 
    label: 'Vitamin D', 
    unit: 'ng/mL', 
    placeholder: '30', 
    hint: '30–100', 
    description: 'Essential for bone health, immunity, and mood regulation.',
    optimalRange: '30–100 ng/mL',
    affects: 'Sun exposure, body fat, dietary intake, and supplementation.',
    foods: 'Salmon, sardines, egg yolks, fortified dairy/alternatives.',
    retest: '8-12 weeks after supplementation changes.',
    category: 'Nutritional' 
  },
  { 
    key: 'vitaminB12', 
    label: 'Vitamin B12', 
    unit: 'pg/mL', 
    placeholder: '400', 
    hint: '300–900', 
    description: 'Critical for energy, nerve function, and red blood cells.',
    optimalRange: '300–900 pg/mL',
    affects: 'Animal-food intake, gut absorption, GI health, and medications.',
    foods: 'Eggs, fish, dairy, meat, or fortified foods (if plant-based).',
    retest: '8-12 weeks after targeted intake/supplement updates.',
    category: 'Nutritional' 
  },
  { 
    key: 'ferritin', 
    label: 'Ferritin', 
    unit: 'ng/mL', 
    placeholder: '50', 
    hint: '30–300', 
    description: 'Iron storage protein. Indicates iron status and inflammation.',
    optimalRange: '30–300 ng/mL',
    affects: 'Dietary iron, inflammation, blood loss, and absorption quality.',
    foods: 'Red meat, shellfish, legumes, spinach + vitamin C foods.',
    retest: '8-12 weeks after iron strategy changes.',
    category: 'Nutritional' 
  },
  {
    key: 'iron',
    label: 'Serum Iron',
    unit: 'mcg/dL',
    placeholder: '80',
    hint: '60–170',
    description: 'Circulating iron. Essential for oxygen transport in blood.',
    optimalRange: '60–170 mcg/dL',
    affects: 'Intake timing, inflammation, blood loss, and absorption.',
    foods: 'Lean red meat, legumes, leafy greens, citrus with iron meals.',
    retest: '6-10 weeks after intake/supplement adjustments.',
    category: 'Nutritional'
  },
  {
    key: 'alt',
    label: 'ALT',
    unit: 'U/L',
    placeholder: '25',
    hint: '0–41',
    description: 'Alanine aminotransferase. Liver enzyme indicating hepatic health.',
    optimalRange: '0–41 U/L (male), 0–33 U/L (female)',
    affects: 'Alcohol, weight gain, medications, processed food load, and sleep.',
    foods: 'High-fiber whole foods, cruciferous vegetables, fish, olive oil.',
    retest: '6-8 weeks after reducing liver stressors.',
    category: 'Hepatic',
  },
  {
    key: 'ast',
    label: 'AST',
    unit: 'U/L',
    placeholder: '22',
    hint: '0–40',
    description: 'Aspartate aminotransferase. Liver and muscle health indicator.',
    optimalRange: '0–40 U/L (male), 0–32 U/L (female)',
    affects: 'Liver strain, intense training, alcohol, and medications.',
    foods: 'Whole-food diet, lean proteins, vegetables, and hydration.',
    retest: '6-8 weeks after recovery and nutrition changes.',
    category: 'Hepatic',
  },
  {
    key: 'albumin',
    label: 'Albumin',
    unit: 'g/dL',
    placeholder: '4.2',
    hint: '3.5–5.5',
    description: 'Protein made by the liver. Reflects nutrition and liver function.',
    optimalRange: '3.5–5.5 g/dL',
    affects: 'Protein intake, liver function, hydration, and inflammation.',
    foods: 'Eggs, fish, poultry, greek yogurt, legumes, and tofu.',
    retest: '8-12 weeks after improving protein/nutrition adequacy.',
    category: 'Hepatic',
    step: '0.1',
  },
  {
    key: 'creatinine',
    label: 'Creatinine',
    unit: 'mg/dL',
    placeholder: '0.9',
    hint: '0.7–1.3',
    description: 'Waste product filtered by kidneys. Indicates kidney function.',
    optimalRange: '0.7–1.3 mg/dL (male), 0.6–1.1 mg/dL (female)',
    affects: 'Hydration, kidney function, muscle mass, and high meat intake.',
    foods: 'Hydration-first approach, balanced protein, less excess sodium.',
    retest: '4-8 weeks if elevated or after hydration changes.',
    category: 'Renal',
    step: '0.01',
  },
  {
    key: 'uricAcid',
    label: 'Uric Acid',
    unit: 'mg/dL',
    placeholder: '5.5',
    hint: '3.5–7.2',
    description: 'Byproduct of purine metabolism. Elevated levels linked to gout and kidney issues.',
    optimalRange: '3.5–7.2 mg/dL (male), 2.6–6.0 mg/dL (female)',
    affects: 'Fructose intake, alcohol, hydration, and purine-rich foods.',
    foods: 'Water, cherries, low-fat dairy, vegetables, and whole grains.',
    retest: '6-10 weeks after diet/hydration adjustments.',
    category: 'Renal',
    step: '0.1',
  },
  {
    key: 'fastingInsulin',
    label: 'Fasting Insulin',
    unit: 'mIU/L',
    placeholder: '5',
    hint: '2–25',
    description: 'Insulin level after fasting. Used to assess insulin resistance (HOMA-IR).',
    optimalRange: '2–6 mIU/L (optimal)',
    affects: 'Refined carb load, sleep, stress, activity, and body fat.',
    foods: 'Protein-forward meals, high-fiber carbs, legumes, and veggies.',
    retest: '6-10 weeks after insulin-sensitivity focused changes.',
    category: 'Metabolic',
    step: '0.1',
  },
];
*/

const HEALTHY_PRESET: BloodMarkers = {
  glucose: 90,
  hba1c: 5.2,
  totalCholesterol: 180,
  ldl: 90,
  hdl: 65,
  triglycerides: 110,
  tsh: 2,
  vitaminD: 45,
  vitaminB12: 550,
  ferritin: 80,
  iron: 100,
  alt: 20,
  ast: 18,
  albumin: 4.5,
  creatinine: 0.9,
  uricAcid: 5,
  fastingInsulin: 4.5,
};

const DEFICIENT_PRESET: BloodMarkers = {
  glucose: 110,
  hba1c: 6.3,
  totalCholesterol: 230,
  ldl: 150,
  hdl: 38,
  triglycerides: 220,
  tsh: 4.8,
  vitaminD: 18,
  vitaminB12: 210,
  ferritin: 15,
  iron: 45,
  alt: 65,
  ast: 55,
  albumin: 3.1,
  creatinine: 1.6,
  uricAcid: 8.5,
  fastingInsulin: 28,
};

const SUFFICIENT_PRESET: BloodMarkers = {
  glucose: 98,
  hba1c: 5.6,
  totalCholesterol: 195,
  ldl: 110,
  hdl: 55,
  triglycerides: 150,
  tsh: 3.2,
  vitaminD: 32,
  vitaminB12: 380,
  ferritin: 45,
  iron: 75,
  alt: 35,
  ast: 30,
  albumin: 3.8,
  creatinine: 1.1,
  uricAcid: 6.5,
  fastingInsulin: 12,
};

export default function BloodValuesForm({ onSubmit, initialValues }: BloodValuesFormProps) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<BloodMarkers>({
    defaultValues: initialValues || {},
  });

  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [activeMobileField, setActiveMobileField] = useState<(typeof FIELDS)[number] | null>(null);
  const [filledCount, setFilledCount] = useState(0);

  const formValues = watch();

  useEffect(() => {
    reset(initialValues || {});
  }, [initialValues, reset]);

  useEffect(() => {
    const filled = Object.values(formValues).filter(
      (v) => v !== undefined && v !== null && v !== ''
    ).length;
    setFilledCount(filled);
  }, [formValues]);

  const numberField = {
    setValueAs: (value: unknown) => {
      if (value === '' || value === null || value === undefined) return undefined;
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    },
  };

  // Group fields by category
  const categories = ['Metabolic', 'Cardiovascular', 'Hormonal', 'Nutritional', 'Hepatic', 'Renal'];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Progress + presets */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Progress: <span style={{ color: 'var(--primary-500)' }}>{filledCount}/{FIELDS.length}</span> markers
          </p>
          <div className="w-full sm:w-32 h-1.5 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(filledCount / FIELDS.length) * 100}%`,
                backgroundColor: 'var(--primary-500)',
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            className="text-xs sm:text-sm px-3 py-2 rounded-lg border btn-press text-left"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
            onClick={() => reset(HEALTHY_PRESET)}
          >
            <span className="block font-semibold">Healthy</span>
            <span className="block text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Optimal marker ranges
            </span>
          </button>
          <button
            type="button"
            className="text-xs sm:text-sm px-3 py-2 rounded-lg border btn-press text-left"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
            onClick={() => reset(DEFICIENT_PRESET)}
          >
            <span className="block font-semibold">Deficient</span>
            <span className="block text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Higher risk & low nutrients
            </span>
          </button>
          <button
            type="button"
            className="text-xs sm:text-sm px-3 py-2 rounded-lg border btn-press text-left"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
            onClick={() => reset(SUFFICIENT_PRESET)}
          >
            <span className="block font-semibold">Sufficient</span>
            <span className="block text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Mostly okay with mild flags
            </span>
          </button>
        </div>
      </div>

      {/* Form sections */}
      {categories.map((cat) => {
        const catFields = FIELDS.filter((f) => f.category === cat);
        return (
          <div key={cat} className="space-y-3">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {cat}
            </p>
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-3">
              {catFields.map((field) => (
                <div key={field.key}>
                  <div
                    className="h-full p-3 rounded-lg border transition-all cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor:
                        expandedField === field.key
                          ? 'var(--primary-400)'
                          : 'var(--border-color)',
                    }}
                    onClick={() =>
                      setExpandedField(
                        expandedField === field.key ? null : field.key
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <label className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {field.label}
                        </label>
                        <Info className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        {field.hint}
                      </span>
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        step={field.step || 'any'}
                        {...register(field.key, numberField)}
                        className="input-field flex-1 text-sm"
                        placeholder={field.placeholder}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span
                        className="text-xs font-medium px-2 py-1 rounded"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {field.unit}
                      </span>
                    </div>

                    {/* Expanded details */}
                    {expandedField === field.key && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                          {field.description}
                        </p>
                        <div
                          className="text-xs p-2 rounded"
                          style={{
                            backgroundColor: 'rgba(160, 90, 90, 0.08)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span className="font-semibold">Optimal range:</span> {field.optimalRange}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile tap-to-edit bottom sheet */}
            <div className="md:hidden space-y-2">
              {catFields.map((field) => {
                const currentVal = formValues[field.key];
                return (
                  <button
                    key={`${cat}-mobile-${field.key}`}
                    type="button"
                    className="w-full text-left p-3 rounded-lg border btn-press"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                    }}
                    onClick={() => {
                      debugLog({
                        hypothesisId: 'Q15_mobile_bottom_sheet_open',
                        location: 'components/BloodValuesForm.tsx:open_mobile_sheet',
                        message: 'Opened mobile bottom sheet for marker',
                        data: { markerKey: field.key, unit: field.unit, currentVal: currentVal ?? null },
                      });
                      setActiveMobileField(field);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {field.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          Optimal: {field.optimalRange}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {currentVal ?? '--'}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {field.unit}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold btn-press group transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #a05a5a 0%, #b86868 100%)',
          color: 'var(--text-inverse)',
          boxShadow: '0 2px 8px rgba(160, 90, 90, 0.3)',
        }}
      >
        {filledCount === 0 ? 'Analyze with Averages' : `Analyze Blood Values (${filledCount})`}
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
      </button>

      {activeMobileField && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close marker details"
            className="absolute inset-0 bg-black/35"
            onClick={() => {
              debugLog({
                hypothesisId: 'Q15_mobile_bottom_sheet_close',
                location: 'components/BloodValuesForm.tsx:close_mobile_sheet_overlay',
                message: 'Closed mobile bottom sheet (overlay click)',
                data: { markerKey: activeMobileField.key },
              });
              setActiveMobileField(null);
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl p-5 animate-fade-up"
            style={{
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              boxShadow: '0 -6px 24px rgba(0,0,0,0.14)',
            }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {activeMobileField.label}
                </h4>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Optimal: {activeMobileField.optimalRange}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  debugLog({
                    hypothesisId: 'Q15_mobile_bottom_sheet_done',
                    location: 'components/BloodValuesForm.tsx:done_mobile_sheet',
                    message: 'Closed mobile bottom sheet (Done)',
                    data: {
                      markerKey: activeMobileField.key,
                      committedVal: formValues[activeMobileField.key] ?? null,
                    },
                  });
                  setActiveMobileField(null);
                }}
                className="text-xs font-semibold px-2.5 py-1 rounded-md"
                style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}
              >
                Done
              </button>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Value ({activeMobileField.unit})
              </label>
              <input
                type="number"
                step={activeMobileField.step || 'any'}
                value={formValues[activeMobileField.key] ?? ''}
                onChange={(e) => setValue(activeMobileField.key, e.target.value === '' ? undefined : Number(e.target.value))}
                className="input-field mt-1 text-2xl font-semibold tabular-nums"
                placeholder={activeMobileField.placeholder}
              />
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <p style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>What this measures:</span>{' '}
                {activeMobileField.description}
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>What affects it:</span>{' '}
                {activeMobileField.affects}
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Foods that help:</span>{' '}
                {activeMobileField.foods}
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>When to retest:</span>{' '}
                {activeMobileField.retest}
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
