'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { UserProfile } from '@/types';
import {
  estimateMarkersFromLifestyle,
  type EstimationResult,
  type QuestionnaireAnswers,
} from '@/lib/estimateFromQuestionnaire';

interface Props {
  profile: UserProfile;
  open: boolean;
  onClose: () => void;
  onComplete: (result: EstimationResult) => void;
}

const DEFAULTS: QuestionnaireAnswers = {
  dietQuality: 'mixed',
  saturatedFatIntake: 'moderate',
  fiberIntake: 'moderate',
  cardioFrequency: 'occasional',
  resistanceTraining: false,
  knownLipidIssue: 'none',
  knownGlucoseIssue: 'none',
  recentWeightChange: 'stable',
};

interface OptionGroupProps<T extends string> {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function OptionGroup<T extends string>({ label, hint, value, options, onChange }: OptionGroupProps<T>) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {hint && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {hint}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="text-xs sm:text-sm px-3 py-2 rounded-lg border btn-press"
              style={{
                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                color: selected ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: selected ? 600 : 500,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LifestyleEstimateModal({ profile, open, onClose, onComplete }: Props) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(DEFAULTS);

  if (!open) return null;

  const update = <K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const result = estimateMarkersFromLifestyle(profile, answers);
    onComplete(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close lifestyle questionnaire"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4 border-b"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Estimate from Lifestyle
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg btn-press"
            style={{ color: 'var(--text-tertiary)', background: 'var(--border-light)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Answer a few questions and we&apos;ll estimate likely ranges for your lipid and glucose markers.
            These are rough estimates — not a substitute for a real blood panel.
          </p>

          <OptionGroup
            label="Overall diet quality"
            hint="Whole foods vs processed/fast food"
            value={answers.dietQuality}
            onChange={(v) => update('dietQuality', v)}
            options={[
              { value: 'poor', label: 'Mostly processed' },
              { value: 'mixed', label: 'Mixed' },
              { value: 'clean', label: 'Mostly whole foods' },
            ]}
          />

          <OptionGroup
            label="Saturated fat intake"
            hint="Red meat, butter, cheese, fried foods"
            value={answers.saturatedFatIntake}
            onChange={(v) => update('saturatedFatIntake', v)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'high', label: 'High' },
            ]}
          />

          <OptionGroup
            label="Fiber intake"
            hint="Vegetables, fruit, legumes, whole grains"
            value={answers.fiberIntake}
            onChange={(v) => update('fiberIntake', v)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'high', label: 'High' },
            ]}
          />

          <OptionGroup
            label="Cardio frequency"
            value={answers.cardioFrequency}
            onChange={(v) => update('cardioFrequency', v)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'occasional', label: '1–2/wk' },
              { value: 'regular', label: '3–4/wk' },
              { value: 'high', label: '5+/wk' },
            ]}
          />

          <div className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Resistance training
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, label: 'Yes' },
                { value: false, label: 'No' },
              ].map((opt) => {
                const selected = opt.value === answers.resistanceTraining;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => update('resistanceTraining', opt.value)}
                    className="text-xs sm:text-sm px-3 py-2 rounded-lg border btn-press"
                    style={{
                      borderColor: selected ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                      color: selected ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: selected ? 600 : 500,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <OptionGroup
            label="Known cholesterol issue"
            value={answers.knownLipidIssue}
            onChange={(v) => update('knownLipidIssue', v)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'borderline', label: 'Borderline' },
              { value: 'diagnosed', label: 'Diagnosed' },
            ]}
          />

          <OptionGroup
            label="Known glucose issue"
            value={answers.knownGlucoseIssue}
            onChange={(v) => update('knownGlucoseIssue', v)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'prediabetes', label: 'Prediabetes' },
              { value: 'diabetes', label: 'Diabetes' },
            ]}
          />

          <OptionGroup
            label="Recent weight trend (3–6 months)"
            value={answers.recentWeightChange}
            onChange={(v) => update('recentWeightChange', v)}
            options={[
              { value: 'losing', label: 'Losing' },
              { value: 'stable', label: 'Stable' },
              { value: 'gaining', label: 'Gaining' },
            ]}
          />
        </div>

        <div
          className="sticky bottom-0 px-5 py-4 border-t flex justify-end gap-2"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold btn-press"
            style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-xs font-semibold btn-press"
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: 'var(--text-inverse)',
              boxShadow: '0 2px 8px rgba(107, 143, 113, 0.25)',
            }}
          >
            Estimate my ranges
          </button>
        </div>
      </div>
    </div>
  );
}
