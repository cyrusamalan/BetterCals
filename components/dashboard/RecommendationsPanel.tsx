'use client';

import { PersonalizedRecs } from '@/types';
import { Droplets, Scale, HeartPulse, Pill, Dumbbell } from 'lucide-react';

interface RecommendationsPanelProps {
  recs: PersonalizedRecs;
}

function getBmiColor(category: string): string {
  switch (category) {
    case 'Underweight': return 'var(--status-info)';
    case 'Normal': return 'var(--status-normal)';
    case 'Overweight': return 'var(--status-warning)';
    case 'Obese': return 'var(--status-danger)';
    default: return 'var(--text-secondary)';
  }
}

function getBmiPosition(bmi: number): number {
  // Map BMI 15-40 to 0-100%
  return Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100));
}

function getRatioColor(interpretation: string): string {
  if (interpretation === 'Optimal') return 'var(--status-normal)';
  if (interpretation === 'Normal') return 'var(--accent-warm)';
  if (interpretation === 'Borderline' || interpretation === 'Elevated') return 'var(--status-warning)';
  if (interpretation.startsWith('High Risk')) return 'var(--status-danger)';
  return 'var(--text-secondary)';
}

export default function RecommendationsPanel({ recs }: RecommendationsPanelProps) {
  const glasses = Math.round(recs.waterIntakeOz / 8);
  const bmiColor = getBmiColor(recs.bmiCategory);
  const bmiPos = getBmiPosition(recs.bmi);
  const tgHdlColor =
    recs.tgHdlInterpretation === null ? 'var(--text-secondary)' :
    recs.tgHdlInterpretation === 'Optimal' ? 'var(--status-normal)' :
    recs.tgHdlInterpretation === 'Borderline' ? 'var(--status-warning)' :
    'var(--status-danger)';

  return (
    <div
      className="relative overflow-hidden rounded-2xl noise"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Personalized Recommendations</h3>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* BMI */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
              Body Mass Index
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-3xl" style={{ color: bmiColor }}>{recs.bmi}</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${bmiColor}18`, color: bmiColor }}
            >
              {recs.bmiCategory}
            </span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-light)' }}>
            <div
              className="absolute inset-y-0 rounded-full"
              style={{ left: '14%', width: '40%', backgroundColor: 'var(--status-normal-bg)', border: '1px solid var(--status-normal-border)' }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 needle-pop"
              style={{
                left: `${bmiPos}%`,
                transform: `translateX(-50%) translateY(-50%)`,
                backgroundColor: bmiColor,
                borderColor: 'var(--surface)',
                boxShadow: `0 0 0 1px ${bmiColor}33`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>15</span>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>40</span>
          </div>
        </div>

        {/* Water Intake */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4" style={{ color: 'var(--status-info)' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
              Daily Water Intake
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl" style={{ color: 'var(--status-info)' }}>{recs.waterIntakeOz}</span>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>oz/day</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>({glasses} glasses)</span>
          </div>
        </div>

        {/* Ratios */}
        {(recs.ldlHdlRatio !== null && recs.ldlHdlInterpretation !== null) ||
        (recs.tgHdlRatio !== null && recs.tgHdlInterpretation !== null) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* LDL/HDL */}
            {recs.ldlHdlRatio !== null && recs.ldlHdlInterpretation !== null && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <HeartPulse className="w-4 h-4" style={{ color: 'var(--accent-rose)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
                    LDL/HDL Ratio
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl" style={{ color: getRatioColor(recs.ldlHdlInterpretation) }}>
                    {recs.ldlHdlRatio}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${getRatioColor(recs.ldlHdlInterpretation)}18`,
                      color: getRatioColor(recs.ldlHdlInterpretation),
                    }}
                  >
                    {recs.ldlHdlInterpretation}
                  </span>
                </div>
              </div>
            )}

            {/* TG/HDL */}
            {recs.tgHdlRatio !== null && recs.tgHdlInterpretation !== null && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <HeartPulse className="w-4 h-4" style={{ color: 'var(--accent-warm)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
                    TG/HDL Ratio
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl" style={{ color: tgHdlColor }}>
                    {recs.tgHdlRatio}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${tgHdlColor}18`,
                      color: tgHdlColor,
                    }}
                  >
                    {recs.tgHdlInterpretation}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Waist-to-Hip Ratio */}
        {recs.waistToHipRatio !== null && recs.waistToHipInterpretation !== null && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4" style={{ color: 'var(--accent-warm)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
                Waist-to-Hip Ratio
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl" style={{ color: getRatioColor(recs.waistToHipInterpretation) }}>
                {recs.waistToHipRatio}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${getRatioColor(recs.waistToHipInterpretation)}18`,
                  color: getRatioColor(recs.waistToHipInterpretation),
                }}
              >
                {recs.waistToHipInterpretation}
              </span>
            </div>
          </div>
        )}

        {/* Supplements */}
        {recs.supplements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Pill className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
                Suggested Supplements
              </span>
            </div>
            <div className="space-y-2">
              {recs.supplements.map((sup) => (
                <div
                  key={sup.name}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{sup.name}</span>
                      <span className="text-xs" style={{ color: 'var(--accent)' }}>{sup.dosage}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sup.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise Suggestions */}
        {recs.exerciseSuggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-4 h-4" style={{ color: 'var(--accent-warm)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
                Exercise Suggestions
              </span>
            </div>
            <ul className="space-y-2">
              {recs.exerciseSuggestions.map((sug, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: 'var(--accent-warm)' }}
                  />
                  {sug}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
