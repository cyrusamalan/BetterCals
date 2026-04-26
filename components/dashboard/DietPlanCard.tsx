'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, Coffee, Sun, Moon, Apple, Droplet, AlertCircle, Utensils, Globe, ChefHat } from 'lucide-react';
import type { UserProfile, BloodMarkers, AnalysisResult, DietPlan, DietPlanMealSlot, Allergy, Cuisine, CookingTime } from '@/types';

interface DietPlanCardProps {
  profile: UserProfile;
  markers: BloodMarkers;
  result: AnalysisResult;
  analysisId?: number;
  initialPlan?: DietPlan;
  onPlanUpdated?: (plan: DietPlan) => void;
}

const SLOT_META: Record<DietPlanMealSlot, { label: string; Icon: typeof Coffee }> = {
  breakfast: { label: 'Breakfast', Icon: Coffee },
  lunch: { label: 'Lunch', Icon: Sun },
  dinner: { label: 'Dinner', Icon: Moon },
  snack: { label: 'Snack', Icon: Apple },
};

export default function DietPlanCard({
  profile,
  markers,
  result,
  analysisId,
  initialPlan,
  onPlanUpdated,
}: DietPlanCardProps) {
  const [plan, setPlan] = useState<DietPlan | undefined>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>(profile.allergies ?? []);
  const [dislikesText, setDislikesText] = useState((profile.dislikes ?? []).join(', '));
  const [preferredCuisines, setPreferredCuisines] = useState<Cuisine[]>(profile.preferredCuisines ?? []);
  const [cookingTime, setCookingTime] = useState<CookingTime | undefined>(profile.cookingTime);

  const generate = async () => {
    const mergedProfile: UserProfile = {
      ...profile,
      allergies: allergies.length > 0 ? allergies : undefined,
      dislikes: parseDislikes(dislikesText),
      preferredCuisines: preferredCuisines.length > 0 ? preferredCuisines : undefined,
      cookingTime,
    };

    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const resp = await fetch('/api/diet-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, profile: mergedProfile, markers, result }),
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${resp.status})`);
      }
      const data = (await resp.json()) as { dietPlan: DietPlan; fallbackUsed?: boolean; warning?: string };
      setPlan(data.dietPlan);
      if (data.fallbackUsed && data.warning) setWarning(data.warning);
      onPlanUpdated?.(data.dietPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate diet plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl noise"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Personalized Diet Plan
            </h3>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            One-day meal plan tuned to your TDEE, macros, blood markers, and food preferences.
          </p>
        </div>
        {plan && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text-secondary)',
              border: '1.5px solid var(--border-light)',
            }}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating…' : 'Regenerate'}
          </button>
        )}
      </div>

      <div className="px-5 py-5">
        <div
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
        >
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Food Preferences
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Set these right before generating your tailored diet plan.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 mb-2">
                <Utensils className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Allergies / Strict Avoid
                </span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {ALLERGY_OPTIONS.map((opt) => {
                  const selected = allergies.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAllergies((current) => (selected
                          ? current.filter((item) => item !== opt.value)
                          : [...current, opt.value]));
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                      style={{
                        backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                        color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 mb-2">
                <Utensils className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Foods You Dislike
                </span>
              </label>
              <input
                type="text"
                value={dislikesText}
                onChange={(event) => setDislikesText(event.target.value)}
                className="input-field"
                placeholder="e.g. mushrooms, cilantro, liver"
                maxLength={200}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 mb-2">
                <Globe className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Preferred Cuisines
                </span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {CUISINE_OPTIONS.map((opt) => {
                  const selected = preferredCuisines.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPreferredCuisines((current) => (selected
                          ? current.filter((item) => item !== opt.value)
                          : [...current, opt.value]));
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                      style={{
                        backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                        color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 mb-2">
                <ChefHat className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Cooking Time
                </span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {COOKING_TIME_OPTIONS.map((opt) => {
                  const selected = cookingTime === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCookingTime(selected ? undefined : opt.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                      style={{
                        backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                        color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {!plan && !loading && (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
              Generate a sample one-day plan that hits your calorie & macro targets, respects your allergies and dietary pattern, and prioritizes foods aligned with your blood markers.
            </p>
            <button
              type="button"
              onClick={generate}
              className="mt-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                border: '1.5px solid var(--accent)',
              }}
            >
              Generate diet plan
            </button>
            {error && (
              <p className="text-xs mt-2" style={{ color: 'var(--status-danger)' }}>
                {error}
              </p>
            )}
          </div>
        )}

        {loading && !plan && (
          <div className="space-y-3 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl animate-pulse"
                style={{ backgroundColor: 'var(--bg-warm)' }}
              />
            ))}
          </div>
        )}

        {plan && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {plan.summary}
            </p>

            {plan.flags && plan.flags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {plan.flags.map((f, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-md text-[11px] font-medium"
                    style={{
                      backgroundColor: 'var(--accent-subtle)',
                      color: 'var(--accent)',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {plan.keyPrinciples.length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Key principles
                </p>
                <ul className="space-y-1">
                  {plan.keyPrinciples.map((p, i) => (
                    <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--accent)' }}>•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3">
              {plan.meals.map((meal, i) => {
                const meta = SLOT_META[meal.slot];
                const Icon = meta.Icon;
                return (
                  <div
                    key={i}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
                        style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
                            {meta.label}
                          </span>
                          {meal.timeWindow && (
                            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                              {meal.timeWindow}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {meal.name}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <MacroChip label={`${meal.calories} kcal`} />
                          <MacroChip label={`P ${meal.protein}g`} />
                          <MacroChip label={`C ${meal.carbs}g`} />
                          <MacroChip label={`F ${meal.fat}g`} />
                        </div>
                        {meal.ingredients.length > 0 && (
                          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>Ingredients: </span>
                            {meal.ingredients.join(', ')}
                          </p>
                        )}
                        {meal.prepNotes && (
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {meal.prepNotes}
                          </p>
                        )}
                        {meal.rationale && (
                          <p className="text-[11px] mt-2 italic" style={{ color: 'var(--text-tertiary)' }}>
                            {meal.rationale}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Droplet className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              <span>Hydration target: <strong>{plan.hydrationOz} oz</strong></span>
            </div>

            {warning && (
              <div
                className="flex items-start gap-2 rounded-lg p-3 text-xs"
                style={{
                  backgroundColor: 'var(--bg-warm)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-tertiary)',
                }}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            )}

            {error && (
              <p className="text-xs" style={{ color: 'var(--status-danger)' }}>
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ALLERGY_OPTIONS: { value: Allergy; label: string }[] = [
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'tree-nuts', label: 'Tree Nuts' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'soy', label: 'Soy' },
  { value: 'fish', label: 'Fish' },
  { value: 'sesame', label: 'Sesame' },
];

const CUISINE_OPTIONS: { value: Cuisine; label: string }[] = [
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'asian', label: 'Asian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'indian', label: 'Indian' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'american', label: 'American' },
  { value: 'no-preference', label: 'No Preference' },
];

const COOKING_TIME_OPTIONS: { value: CookingTime; label: string }[] = [
  { value: 'quick', label: 'Quick (<=15 min)' },
  { value: 'moderate', label: 'Moderate (15-30 min)' },
  { value: 'elaborate', label: 'Elaborate (30+ min)' },
];

function parseDislikes(text: string | undefined): string[] | undefined {
  if (!text) return undefined;
  const items = text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 40)
    .slice(0, 10);
  return items.length > 0 ? items : undefined;
}

function MacroChip({ label }: { label: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{
        backgroundColor: 'var(--surface)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-light)',
      }}
    >
      {label}
    </span>
  );
}
