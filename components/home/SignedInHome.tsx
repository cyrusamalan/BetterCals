'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, Flame, Beef, Wheat, Droplet as DropletIcon, Target,
  Utensils, AlertTriangle, TrendingUp, TrendingDown, Minus,
  MessageCircle, History as HistoryIcon, ArrowRight, CheckCircle2,
  Footprints, Coffee, Sun, Moon, Apple, RefreshCw, ChevronRight, Activity, Mic, MicOff, X, Loader2, Globe, ChefHat, Dumbbell,
  Stethoscope,
} from 'lucide-react';
import type {
  AnalysisHistory, AnalysisResult, BloodMarkers, UserProfile, ActionPlanItem,
  DietPlanMealSlot, CoachHistoryEvent, CoachMessage, CoachPlan, DietPlan, Allergy, Cuisine, CookingTime, WorkoutPlan,
  WorkoutConstraintOption, WorkoutPreferenceOption,
} from '@/types';
import { getMarkerInterpretation } from '@/lib/bloodParser';
import { MARKER_NAMES } from '@/lib/calculations';

const FOCUS_LABELS: Record<string, string> = {
  'fat-loss': 'Fat Loss',
  'muscle-gain': 'Muscle Gain',
  'metabolic-health': 'Metabolic Health',
  'endurance': 'Endurance',
  'longevity': 'Longevity',
  'general-wellness': 'General Wellness',
};

const GOAL_LABELS: Record<UserProfile['goal'], string> = {
  'lose-aggressive': 'Aggressive Cut',
  'lose-moderate': 'Moderate Cut',
  'lose-mild': 'Mild Cut',
  maintain: 'Maintain',
  'gain-lean': 'Lean Bulk',
  'gain-aggressive': 'Aggressive Bulk',
};

const SLOT_ICON: Record<DietPlanMealSlot, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Apple,
};

const SLOT_LABEL: Record<DietPlanMealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const SLOT_ORDER: DietPlanMealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

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

const WORKOUT_CONSTRAINT_OPTIONS: { value: WorkoutConstraintOption; label: string }[] = [
  { value: 'none', label: 'No major limitations' },
  { value: 'knee-discomfort', label: 'Knee discomfort' },
  { value: 'lower-back-sensitivity', label: 'Lower-back sensitivity' },
  { value: 'shoulder-limitation', label: 'Shoulder limitation' },
  { value: 'impact-sensitive-joints', label: 'Impact-sensitive joints' },
  { value: 'balance-concerns', label: 'Balance concerns' },
  { value: 'wrist-elbow-sensitivity', label: 'Wrist/elbow sensitivity' },
];

const WORKOUT_PREFERENCE_OPTIONS: { value: WorkoutPreferenceOption; label: string }[] = [
  { value: 'strength-training', label: 'Strength training' },
  { value: 'walking-cardio', label: 'Walking + cardio' },
  { value: 'mobility-yoga', label: 'Mobility / yoga' },
  { value: 'hiit-lite', label: 'HIIT-lite' },
  { value: 'mixed-balanced', label: 'Mixed balanced' },
];

export default function SignedInHome() {
  const [analyses, setAnalyses] = useState<AnalysisHistory[] | null>(null);
  const [coachEvents, setCoachEvents] = useState<CoachHistoryEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coachState, setCoachState] = useState<'closed' | 'open' | 'closing'>('closed');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [aResp, cResp] = await Promise.all([
          fetch('/api/analyses'),
          fetch('/api/coach/history?limit=10'),
        ]);
        if (!cancelled) {
          if (aResp.ok) setAnalyses((await aResp.json()) as AnalysisHistory[]);
          else setAnalyses([]);
          if (cResp.ok) setCoachEvents((await cResp.json()) as CoachHistoryEvent[]);
          else setCoachEvents([]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load home data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-5 pt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--bg-warm)' }} />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-5 pt-8 pb-16">
        <p className="text-sm" style={{ color: 'var(--status-danger)' }}>
          Could not load your dashboard: {error}
        </p>
      </main>
    );
  }

  const latest = analyses && analyses.length > 0 ? analyses[0] : null;

  if (!latest) {
    return <EmptyHome />;
  }

  const handleOpenCoach = () => setCoachState('open');
  const handleCloseCoach = () => {
    setCoachState('closing');
    setTimeout(() => {
      setCoachState((prev) => (prev === 'closing' ? 'closed' : prev));
    }, 400);
  };

  return (
    <>
      <div 
        className={`transition-transform duration-[400ms] ease-in-out ${
          coachState === 'open' ? 'lg:-translate-x-[200px] xl:-translate-x-[230px]' : 'translate-x-0'
        }`}
      >
        <main className="max-w-6xl mx-auto pl-4 pr-6 lg:pl-3 lg:pr-8 pt-6 pb-16 space-y-5">
          <SafetyBanner markers={latest.markers} profile={latest.profile} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            <div className="space-y-5 lg:h-full lg:flex lg:flex-col">
              <TodaySnapshot analysis={latest} />
              <div className="lg:flex-1">
                <DietPlanSummary analysis={latest} />
              </div>
            </div>
            <div className="space-y-5 lg:h-full">
              <AdherenceChecklist />
              <PriorityAlerts analysis={latest} />
              <TrendStrip history={analyses ?? []} />
            </div>
          </div>

          <RecentHistory latest={latest} />
        </main>
      </div>
      <CoachFloatingPanel 
        analysis={latest} 
        events={coachEvents ?? []} 
        coachState={coachState}
        onOpen={handleOpenCoach}
        onClose={handleCloseCoach}
      />
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function Card({ children, className = '', noPad = false }: { children: React.ReactNode; className?: string; noPad?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl noise ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      {noPad ? children : <div className="p-5">{children}</div>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }: {
  icon: typeof Sparkles;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── 1. Today Snapshot ─────────────────────────────────────────────────────

function TodaySnapshot({ analysis }: { analysis: AnalysisHistory }) {
  const { macros } = analysis.result;
  const tiers = analysis.result.calorieTiers ?? [];
  const focusGoals = analysis.profile.focusGoal ?? [];
  const goalLabel = GOAL_LABELS[analysis.profile.goal] ?? 'Goal';
  const lastUpdated = new Date(analysis.createdAt);
  const macroCalories = Math.round(
    typeof macros.calories === 'number' && Number.isFinite(macros.calories)
      ? macros.calories
      : ((macros.protein.grams * 4) + (macros.carbs.grams * 4) + (macros.fat.grams * 9)),
  );
  const defaultTierIndex = tiers.length > 0
    ? tiers.reduce((bestIdx, tier, idx) => {
      const bestDist = Math.abs(tiers[bestIdx].dailyCalories - macroCalories);
      const currentDist = Math.abs(tier.dailyCalories - macroCalories);
      return currentDist < bestDist ? idx : bestIdx;
    }, 0)
    : -1;
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [selectedTierIndex, setSelectedTierIndex] = useState(defaultTierIndex);

  const selectedTier = selectedTierIndex >= 0 ? tiers[selectedTierIndex] : null;
  const displayCalories = selectedTier ? Math.round(selectedTier.dailyCalories) : macroCalories;
  const proteinTarget = (displayCalories * (macros.protein.pct / 100)) / 4;
  const carbsTarget = (displayCalories * (macros.carbs.pct / 100)) / 4;
  const fatTarget = (displayCalories * (macros.fat.pct / 100)) / 9;

  return (
    <Card>
      <SectionHeader
        icon={Flame}
        title="Today's snapshot"
        subtitle={`Goal targets · Updated ${formatRelative(lastUpdated)}`}
        action={(
          <button
            type="button"
            onClick={() => setShowGoalEditor((prev) => !prev)}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.12em] hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: 'var(--accent-subtle)',
              color: 'var(--accent)',
              border: '1px solid var(--border-light)',
            }}
          >
            Edit goal
          </button>
        )}
      />
      {showGoalEditor && tiers.length > 0 && (
        <div
          className="mb-4 rounded-xl p-3"
          style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
        >
          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Select your calorie goal tier:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {tiers.map((tier, idx) => {
              const selected = idx === selectedTierIndex;
              return (
                <button
                  key={`${tier.label}-${tier.dailyCalories}`}
                  type="button"
                  onClick={() => {
                    setSelectedTierIndex(idx);
                    setShowGoalEditor(false);
                  }}
                  className="text-left rounded-lg px-3 py-2 transition-colors"
                  style={{
                    backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--surface)',
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <p className="text-xs font-semibold">{tier.label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    {Math.round(tier.dailyCalories).toLocaleString()} kcal
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <span className="font-display text-5xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {displayCalories.toLocaleString()}
        </span>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          kcal {selectedTier ? `${selectedTier.label.toLowerCase()} target` : `for ${goalLabel.toLowerCase()}`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <MacroPill icon={Beef} label="Protein" grams={proteinTarget} pct={macros.protein.pct} />
        <MacroPill icon={Wheat} label="Carbs" grams={carbsTarget} pct={macros.carbs.pct} />
        <MacroPill icon={DropletIcon} label="Fat" grams={fatTarget} pct={macros.fat.pct} />
      </div>
      {focusGoals.length > 0 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Target className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-tertiary)' }}>Focus:</span>
          {focusGoals.map((g) => (
            <span
              key={g}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium"
              style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
            >
              {FOCUS_LABELS[g] ?? g}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function MacroPill({ icon: Icon, label, grams, pct }: { icon: typeof Beef; label: string; grams: number; pct: number }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.round(grams)}g</span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>· {Math.round(pct)}%</span>
      </div>
    </div>
  );
}

// ── 2. Diet Plan Summary ──────────────────────────────────────────────────

function DietPlanSummary({ analysis }: { analysis: AnalysisHistory }) {
  const [activeTab, setActiveTab] = useState<'diet' | 'workout'>('diet');
  const [dietPlan, setDietPlan] = useState<DietPlan | undefined>(analysis.result.dietPlan);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | undefined>(analysis.result.workoutPlan);
  const [dietLoading, setDietLoading] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);

  const [allergies, setAllergies] = useState<Allergy[]>(analysis.profile.allergies ?? []);
  const [dislikesText, setDislikesText] = useState((analysis.profile.dislikes ?? []).join(', '));
  const [preferredCuisines, setPreferredCuisines] = useState<Cuisine[]>(analysis.profile.preferredCuisines ?? []);
  const [cookingTime, setCookingTime] = useState<CookingTime | undefined>(analysis.profile.cookingTime);
  const [workoutConstraints, setWorkoutConstraints] = useState<WorkoutConstraintOption[]>(['none']);
  const [workoutConstraintNotes, setWorkoutConstraintNotes] = useState('');
  const [workoutPreferences, setWorkoutPreferences] = useState<WorkoutPreferenceOption[]>(['mixed-balanced']);
  const [showWorkoutFeedbackModal, setShowWorkoutFeedbackModal] = useState(false);
  const [workoutFeedbackText, setWorkoutFeedbackText] = useState('');

  const topMarker = pickPrimaryMarker(analysis.result);
  const mealsBySlot = new Map((dietPlan?.meals ?? []).map((meal) => [meal.slot, meal]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/workout-plan?analysisId=${analysis.id}&limit=1`);
        if (!response.ok) return;
        const rows = (await response.json()) as Array<{ plan?: WorkoutPlan }>;
        if (!cancelled && rows.length > 0 && rows[0]?.plan) {
          setWorkoutPlan(rows[0].plan);
        }
      } catch {
        // non-fatal
      }
    })();
    return () => { cancelled = true; };
  }, [analysis.id]);

  const generateDietPlan = async () => {
    const mergedProfile: UserProfile = {
      ...analysis.profile,
      allergies: allergies.length > 0 ? allergies : undefined,
      dislikes: parseDislikes(dislikesText),
      preferredCuisines: preferredCuisines.length > 0 ? preferredCuisines : undefined,
      cookingTime,
    };

    setShowDietModal(false);
    setDietLoading(true);
    setError(null);
    setWarning(null);
    try {
      const resp = await fetch('/api/diet-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.id,
          profile: mergedProfile,
          markers: analysis.markers,
          result: analysis.result,
        }),
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${resp.status})`);
      }
      const data = (await resp.json()) as { dietPlan: DietPlan; fallbackUsed?: boolean; warning?: string };
      setDietPlan(data.dietPlan);
      if (data.fallbackUsed && data.warning) setWarning(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate diet plan');
    } finally {
      setDietLoading(false);
    }
  };

  const generateWorkout = async () => {
    const sanitizedConstraints = workoutConstraints.includes('none')
      ? ['none']
      : workoutConstraints.filter((item) => item !== 'none');

    setShowWorkoutModal(false);
    setWorkoutLoading(true);
    setError(null);
    setWarning(null);
    try {
      const response = await fetch('/api/workout-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.id,
          profile: analysis.profile,
          markers: analysis.markers,
          result: analysis.result,
          constraints: {
            selected: sanitizedConstraints,
            notes: workoutConstraintNotes.trim() || undefined,
          },
          preferences: {
            selected: workoutPreferences,
          },
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      const data = (await response.json()) as { workoutPlan: WorkoutPlan; fallbackUsed?: boolean; warning?: string };
      setWorkoutPlan(data.workoutPlan);
      if (data.fallbackUsed && data.warning) setWarning(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate workout plan');
    } finally {
      setWorkoutLoading(false);
    }
  };

  return (
    <>
    <Card className="min-h-[34rem] lg:h-full">
      <div className="mb-4 inline-flex rounded-xl p-1" style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('diet')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: activeTab === 'diet' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'diet' ? 'var(--text-inverse)' : 'var(--text-secondary)',
          }}
        >
          Diet plan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('workout')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: activeTab === 'workout' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'workout' ? 'var(--text-inverse)' : 'var(--text-secondary)',
          }}
        >
          Workout plan
        </button>
      </div>

      {activeTab === 'diet' && (
      <>
      <SectionHeader
        icon={Utensils}
        title="Diet plan"
        subtitle={dietPlan ? 'One-day plan tailored to your markers and goal macros' : 'No plan yet'}
        action={
          <Link
            href={`/history/${analysis.id}`}
            className="text-xs font-semibold flex items-center gap-1 hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            Open <ChevronRight className="h-3 w-3" />
          </Link>
        }
      />
      {dietPlan ? (
        <>
          <div
            className="rounded-xl p-3.5"
            style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {dietPlan.summary.length > 180 ? `${dietPlan.summary.slice(0, 180)}…` : dietPlan.summary}
            </p>
          </div>
          {topMarker && (
            <p className="mt-2 text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
              Why: prioritizing {topMarker}.
            </p>
          )}
          <ul className="mt-4 space-y-2.5">
            {SLOT_ORDER.map((slot) => {
              const meal = mealsBySlot.get(slot);
              const Icon = SLOT_ICON[slot];
              return (
                <li
                  key={slot}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                >
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                      {SLOT_LABEL[slot]}
                    </span>
                    <p className="text-sm mt-1 leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {meal?.name ?? 'Not generated yet'}
                    </p>
                  </div>
                  <span
                    className="text-[11px] font-semibold ml-auto flex-shrink-0 px-2 py-1 rounded-md"
                    style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}
                  >
                    {meal ? `${meal.calories} kcal` : '--'}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={`/history/${analysis.id}`} className="px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>
              Open full plan
            </Link>
            <button
              type="button"
              onClick={() => setShowDietModal(true)}
              disabled={dietLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-70"
              style={{ background: 'var(--surface)', border: '1.5px solid var(--border-light)', color: 'var(--text-secondary)' }}
            >
              {dietLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {dietLoading ? 'Generating...' : 'Unlock fully personalized diet plan'}
            </button>
          </div>
        </>
      ) : (
        <div className="py-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Generate a personalized one-day plan from your latest analysis.
          </p>
          <button
            type="button"
            onClick={() => setShowDietModal(true)}
            disabled={dietLoading}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {dietLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {dietLoading ? 'Generating...' : 'Unlock fully personalized diet plan'}
          </button>
        </div>
      )}
      </>
      )}

      {activeTab === 'workout' && (
        <>
          <SectionHeader
            icon={Dumbbell}
            title="Workout plan"
            subtitle={workoutPlan ? 'Weekly plan tailored to your goals and movement considerations' : 'No workout plan yet'}
          />
          {workoutPlan ? (
            <>
              <div className="rounded-xl p-3.5" style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {workoutPlan.summary}
                </p>
                <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                  Weekly goal: {workoutPlan.weeklyGoal}
                </p>
              </div>
              <div className="mt-4 space-y-2.5">
                {workoutPlan.sessions.slice(0, 5).map((session, idx) => (
                  <div key={`${session.day}-${idx}`} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {session.day} - {session.focus}
                      </p>
                      <span className="text-[11px] px-2 py-1 rounded-md" style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                        {session.durationMinutes} min
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Intensity: {session.intensity}
                    </p>
                    {session.main.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        Main: {session.main.slice(0, 2).join(' • ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
                Safety: Adapt intensity based on comfort, stop if pain worsens, and consult a clinician or physiotherapist for persistent pain.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowWorkoutFeedbackModal(true)}
                  disabled={workoutLoading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-70"
                  style={{ background: 'var(--surface)', border: '1.5px solid var(--border-light)', color: 'var(--text-secondary)' }}
                >
                  {workoutLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  {workoutLoading ? 'Generating...' : 'Refine this workout plan'}
                </button>
              </div>
            </>
          ) : (
            <div className="py-3">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Build a personalized workout plan that matches your diet target, age, and movement constraints.
              </p>
              <button
                type="button"
                onClick={() => setShowWorkoutModal(true)}
                disabled={workoutLoading}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {workoutLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {workoutLoading ? 'Generating...' : 'Unlock fully personalized workout plan'}
              </button>
            </div>
          )}
        </>
      )}

      {warning && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
          {warning}
        </p>
      )}
      {error && (
        <p className="text-xs mt-2" style={{ color: 'var(--status-danger)' }}>
          {error}
        </p>
      )}
    </Card>
    {showDietModal && (
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowDietModal(false)}
          aria-label="Close food preferences"
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl p-5 sm:p-6"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Food preferences
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  We will tailor your diet plan from these preferences and your macro goal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDietModal(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 mb-2">
                  <Utensils className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Allergies / strict avoid
                  </span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ALLERGY_OPTIONS.map((opt) => {
                    const selected = allergies.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAllergies((current) => (selected
                          ? current.filter((item) => item !== opt.value)
                          : [...current, opt.value]))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                          color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
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
                    Foods you dislike
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
                    Preferred cuisines
                  </span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CUISINE_OPTIONS.map((opt) => {
                    const selected = preferredCuisines.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPreferredCuisines((current) => (selected
                          ? current.filter((item) => item !== opt.value)
                          : [...current, opt.value]))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                          color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
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
                    Cooking time
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
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                          color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDietModal(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--bg-warm)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void generateDietPlan()}
                className="px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate diet plan
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {showWorkoutModal && (
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowWorkoutModal(false)}
          aria-label="Close workout preferences"
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl p-5 sm:p-6"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Workout preferences
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Tell us your movement considerations and preferred training style for a safer, tailored workout plan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkoutModal(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 mb-2">
                  <Activity className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Movement considerations
                  </span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {WORKOUT_CONSTRAINT_OPTIONS.map((opt) => {
                    const selected = workoutConstraints.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setWorkoutConstraints((current) => {
                            if (opt.value === 'none') return ['none'];
                            const withoutNone = current.filter((item) => item !== 'none');
                            if (selected) return withoutNone.filter((item) => item !== opt.value);
                            return [...withoutNone, opt.value];
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                          color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
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
                  <Activity className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Notes (optional)
                  </span>
                </label>
                <textarea
                  value={workoutConstraintNotes}
                  onChange={(event) => setWorkoutConstraintNotes(event.target.value)}
                  className="input-field min-h-[84px]"
                  placeholder="Any limitations, injuries, or movements you'd like to avoid."
                  maxLength={600}
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 mb-2">
                  <Dumbbell className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Preferred training style
                  </span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {WORKOUT_PREFERENCE_OPTIONS.map((opt) => {
                    const selected = workoutPreferences.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setWorkoutPreferences((current) => {
                            if (selected) {
                              const next = current.filter((item) => item !== opt.value);
                              return next.length > 0 ? next : ['mixed-balanced'];
                            }
                            return [...current, opt.value];
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                          color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWorkoutModal(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--bg-warm)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void generateWorkout()}
                className="px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate workout plan
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {showWorkoutFeedbackModal && (
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowWorkoutFeedbackModal(false)}
          aria-label="Close workout feedback"
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="w-full max-w-xl rounded-2xl p-5 sm:p-6"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Refine your workout plan
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Tell us what is not working (too hard, pain triggers, schedule mismatch, disliked exercises), and we will personalize it further.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkoutFeedbackModal(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <textarea
                value={workoutFeedbackText}
                onChange={(event) => setWorkoutFeedbackText(event.target.value)}
                className="input-field min-h-[120px]"
                placeholder="Example: Lunges bother my right knee, and 45 minutes is too long on weekdays. I prefer lower-impact home workouts."
                maxLength={900}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWorkoutFeedbackModal(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--bg-warm)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const feedback = workoutFeedbackText.trim();
                  if (!feedback) return;
                  setWorkoutConstraintNotes((prev) => {
                    const base = prev.trim();
                    return base ? `${base}\n\nUser plan feedback: ${feedback}` : `User plan feedback: ${feedback}`;
                  });
                  setShowWorkoutFeedbackModal(false);
                  setWorkoutFeedbackText('');
                  void generateWorkout();
                }}
                disabled={!workoutFeedbackText.trim() || workoutLoading}
                className="px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {workoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {workoutLoading ? 'Generating...' : 'Generate improved workout plan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function pickPrimaryMarker(result: AnalysisResult): string | null {
  const ap = result.actionPlan;
  if (ap && ap.length > 0 && ap[0].relatedMarkers.length > 0) {
    const m = ap[0].relatedMarkers[0];
    return MARKER_NAMES[m] ?? m;
  }
  return null;
}

// ── 3. Priority Alerts ────────────────────────────────────────────────────

function PriorityAlerts({ analysis }: { analysis: AnalysisHistory }) {
  const { result, markers } = analysis;
  const items = (result.actionPlan ?? []).slice(0, 3);
  const fallbackItems = items.length === 0 ? derivePriorityFallbackItems(result, markers) : [];
  const displayItems = items.length > 0 ? items : fallbackItems;

  return (
    <Card>
      <SectionHeader
        icon={AlertTriangle}
        title="Health priorities"
        subtitle="Top action items from your latest analysis"
      />
      {displayItems.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No priority alerts — your markers are looking solid.
        </p>
      ) : (
        <div className="space-y-2.5">
          {displayItems.map((item) => (
            <PriorityRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </Card>
  );
}

function PriorityRow({ item }: { item: ActionPlanItem }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
        >
          {item.priority}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.rationale}</p>
        </div>
      </div>
    </div>
  );
}

// ── 4. Trend strip ────────────────────────────────────────────────────────

function TrendStrip({ history }: { history: AnalysisHistory[] }) {
  const ordered = useMemo(
    () => [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [history],
  );

  const weights = ordered.map((h) => h.profile.weightLbs).filter((w): w is number => typeof w === 'number');
  const scores = ordered.map((h) => h.result.healthScore.overall);
  const glucose = ordered.map((h) => h.markers.glucose).filter((v): v is number => typeof v === 'number');
  const ldl = ordered.map((h) => h.markers.ldl).filter((v): v is number => typeof v === 'number');

  return (
    <Card>
      <SectionHeader
        icon={TrendingUp}
        title="Trends"
        subtitle={`${history.length} analyses tracked`}
        action={
          <Link href="/history" className="text-xs font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--accent)' }}>
            All trends <ChevronRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <Sparkline label="Health score" values={scores} unit="" />
        <Sparkline label="Weight" values={weights} unit="lb" />
        <Sparkline label="Glucose" values={glucose} unit="mg/dL" />
        <Sparkline label="LDL" values={ldl} unit="mg/dL" />
      </div>
    </Card>
  );
}

function Sparkline({ label, values, unit }: { label: string; values: number[]; unit: string }) {
  const hasData = values.length >= 2;
  const last = values[values.length - 1];
  const first = values[0];
  const delta = hasData ? last - first : 0;
  const TrendIcon = !hasData ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  let pathD = '';
  if (hasData) {
    const w = 100;
    const h = 30;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    pathD = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
        <TrendIcon className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
      </div>
      {hasData ? (
        <>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {Math.round(last * 10) / 10}{unit && <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-tertiary)' }}>{unit}</span>}
            </span>
            {values.length > 1 && (
              <span className="text-[10px]" style={{ color: delta === 0 ? 'var(--text-tertiary)' : delta > 0 ? 'var(--accent-warm)' : 'var(--accent)' }}>
                {delta > 0 ? '+' : ''}{Math.round(delta * 10) / 10}
              </span>
            )}
          </div>
          <svg viewBox="0 0 100 30" className="mt-1 w-full h-7" preserveAspectRatio="none">
            <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      ) : (
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Not enough data yet.
        </p>
      )}
    </div>
  );
}

// ── 5. Floating Coach Panel ───────────────────────────────────────────────

function TypewriterText({
  text,
  alreadyTyped,
  speed = 16,
  onDone,
}: {
  text: string;
  alreadyTyped: boolean;
  speed?: number;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(alreadyTyped ? text.length : 0);

  useEffect(() => {
    if (alreadyTyped) return;
    if (idx >= text.length) {
      onDone();
      return;
    }
    const step = /\s/.test(text[idx]) ? speed * 0.6 : speed;
    const t = setTimeout(() => setIdx((i) => i + 1), step);
    return () => clearTimeout(t);
  }, [idx, text, speed, alreadyTyped, onDone]);

  const typing = !alreadyTyped && idx < text.length;
  return (
    <>
      {text.slice(0, idx)}
      {typing && <span className="coach-typewriter-caret opacity-70">▍</span>}
    </>
  );
}

function CoachFloatingPanel({ 
  analysis, 
  events,
  coachState,
  onOpen,
  onClose,
}: { 
  analysis: AnalysisHistory; 
  events: CoachHistoryEvent[];
  coachState: 'closed' | 'open' | 'closing';
  onOpen: () => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const liveQuestionRef = useRef('');
  const typedMessageIdsRef = useRef<Set<string>>(new Set());

  const isVisible = coachState === 'open' || coachState === 'closing';
  const isClosing = coachState === 'closing';

  const closeCoachPanel = () => {
    stopListening();
    onClose();
  };

  useEffect(() => {
    if (!isVisible || plan) return;
    (async () => {
      try {
        const response = await fetch('/api/coach/initial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: analysis.profile,
            markers: analysis.markers,
            result: analysis.result,
          }),
        });
        if (!response.ok) throw new Error('Failed to initialize coach');
        const data = await response.json() as { plan: CoachPlan; initialMessage: CoachMessage };
        setPlan(data.plan);
        typedMessageIdsRef.current.add(data.initialMessage.id);
        setMessages([data.initialMessage]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize coach');
      }
    })();
  }, [isVisible, plan, analysis]);

  const persistHistory = async (
    source: 'llm_chat' | 'live_mic' | 'live_model',
    role: 'user' | 'assistant',
    message: string,
  ) => {
    if (!message.trim()) return;
    try {
      await fetch('/api/coach/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          role,
          message,
          analysisId: analysis.id,
        }),
      });
    } catch {
      // best-effort persistence
    }
  };

  const sendQuestion = async (rawQuestion: string, source: 'llm_chat' | 'live_mic' = 'llm_chat') => {
    const question = rawQuestion.trim();
    if (!question || !plan || loading) return;

    const userMessage: CoachMessage = {
      id: `home-coach-user-${Date.now()}`,
      role: 'user',
      source: 'llm_chat',
      text: question,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);
    void persistHistory(source, 'user', question);

    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisSnapshot: {
            profile: analysis.profile,
            markers: analysis.markers,
            result: analysis.result,
          },
          coachPlan: plan,
          messages: nextMessages.map((msg) => ({
            role: msg.role,
            source: msg.source,
            text: msg.text,
          })),
          userQuestion: question,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Coach request failed (${response.status})`);
      }
      const data = await response.json() as { message: CoachMessage };
      setMessages((prev) => [...prev, data.message]);
      void persistHistory(source === 'live_mic' ? 'live_model' : 'llm_chat', 'assistant', data.message.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coach failed to respond');
    } finally {
      setLoading(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const toggleLiveAudio = () => {
    if (listening) {
      stopListening();
      return;
    }
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError('Live audio is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    liveQuestionRef.current = '';
    setLiveTranscript('');

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) {
          liveQuestionRef.current = `${liveQuestionRef.current} ${transcript}`.trim();
        } else {
          interim = transcript;
        }
      }
      const combined = `${liveQuestionRef.current} ${interim}`.trim();
      setLiveTranscript(combined);
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const finalQuestion = liveQuestionRef.current.trim();
      setLiveTranscript('');
      if (finalQuestion) void sendQuestion(finalQuestion, 'live_mic');
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const panelIntroMessage = messages.find((message) => message.role === 'assistant')?.text?.trim();
  const lastAssistant = events.find((event) => event.role === 'assistant')?.message?.trim();
  const coachBubbleText = panelIntroMessage || lastAssistant || 'Tap Coach for a personalized insight based on your latest labs and goals.';

  return (
    <>
      <style>{`
        @keyframes coachSlideInHome {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes coachSlideOutHome {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100%); }
        }
        @keyframes coachFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes coachFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
      {!isVisible && (
        <div
          className="fixed z-40 bottom-20 right-6 max-w-[24rem] rounded-2xl px-3 py-2.5"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Coach insight
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {coachBubbleText}
          </p>
          <div
            className="absolute -bottom-2 right-8 w-3 h-3 rotate-45"
            style={{
              backgroundColor: 'var(--surface)',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}
            aria-hidden
          />
        </div>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="fixed z-40 bottom-6 right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-lg"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
      >
        <MessageCircle className="h-4 w-4" />
        Coach
      </button>

      {isVisible && (
        <>
          <button
            type="button"
            onClick={closeCoachPanel}
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]"
            aria-label="Close coach panel"
            style={{
              animation: isClosing ? 'coachFadeOut 0.4s ease forwards' : 'coachFadeIn 0.4s ease forwards',
            }}
          />
          <aside
            className="fixed right-3 sm:right-4 top-[80px] sm:top-[84px] h-[calc(100vh-104px)] sm:h-[calc(100vh-108px)] w-[calc(100%-1.5rem)] sm:w-[420px] md:w-[460px] z-50 p-4 sm:p-5 overflow-hidden rounded-3xl flex flex-col"
            style={{
              animation: isClosing
                ? 'coachSlideOutHome 0.4s ease forwards'
                : 'coachSlideInHome 0.4s cubic-bezier(0.22, 1.12, 0.36, 1) forwards',
              willChange: 'transform, opacity',
              background: 'linear-gradient(165deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.008) 100%)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(2px) saturate(1.01)',
              WebkitBackdropFilter: 'blur(2px) saturate(1.01)',
              boxShadow: [
                '0 10px 18px rgba(8, 12, 22, 0.05)',
                '0 2px 8px rgba(8, 12, 22, 0.02)',
                'inset 0 1px 0 rgba(255,255,255,0.26)',
                'inset 0 -1px 0 rgba(255,255,255,0.05)',
              ].join(', '),
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                background:
                  'radial-gradient(160% 80% at 8% -18%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.10) 38%, transparent 68%), radial-gradient(110% 70% at 100% 110%, rgba(125, 186, 133, 0.22) 0%, transparent 62%)',
                mixBlendMode: 'screen',
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 20%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.85) 80%, transparent 100%)',
              }}
            />
            <div className="relative mb-4 shrink-0">
              <Link
                href="/coach-history"
                className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold btn-press"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.45)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                History
              </Link>
              <h2 className="font-display text-xl text-center" style={{ color: 'var(--text-primary)' }}>
                Coach
              </h2>
              <button
                type="button"
                onClick={closeCoachPanel}
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.45)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                Close
              </button>
            </div>

            <div className="space-y-4 relative z-[1] flex-1 min-h-0">
              <div className="rounded-2xl p-4 h-full flex flex-col" style={{ backgroundColor: 'rgba(255,255,255,0.38)', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.75)' }}>
                <div className="mt-3 space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Ask a question to start the conversation.
                    </p>
                  ) : messages.map((message) => {
                    const isAssistant = message.role === 'assistant';
                    const alreadyTyped = !isAssistant || typedMessageIdsRef.current.has(message.id);
                    return (
                      <div
                        key={message.id}
                        className="rounded-xl px-3 py-2"
                        style={{
                          backgroundColor: isAssistant ? 'rgba(255,255,255,0.45)' : 'rgba(107, 143, 113, 0.12)',
                          border: 'none',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.65)',
                        }}
                      >
                        <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                          {isAssistant ? 'Coach' : 'You'}
                        </p>
                        <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                          {isAssistant ? (
                            <TypewriterText
                              text={message.text}
                              alreadyTyped={alreadyTyped}
                              onDone={() => {
                                typedMessageIdsRef.current.add(message.id);
                              }}
                            />
                          ) : (
                            message.text
                          )}
                        </p>
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="inline-flex items-center gap-2 text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Coach is thinking...
                    </div>
                  )}
                  {liveTranscript && (
                    <div className="text-xs italic mt-2" style={{ color: 'var(--text-tertiary)' }}>
                      Listening: {liveTranscript}
                    </div>
                  )}
                  {error && (
                    <p className="text-xs mt-2" style={{ color: 'var(--status-danger)' }}>
                      {error}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void sendQuestion(input, 'llm_chat');
                      }
                    }}
                    placeholder="Ask the coach..."
                    className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    style={{
                      border: 'none',
                      backgroundColor: 'rgba(255,255,255,0.55)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.05)',
                      color: 'var(--text-primary)',
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={toggleLiveAudio}
                    className="rounded-xl px-3 py-2 text-sm font-semibold btn-press transition-colors"
                    style={{
                      backgroundColor: listening ? 'rgba(220, 38, 38, 0.15)' : 'rgba(255,255,255,0.55)',
                      color: listening ? 'var(--status-danger)' : 'var(--text-primary)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.05)',
                    }}
                    aria-label={listening ? 'Stop live audio' : 'Start live audio'}
                  >
                    {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendQuestion(input, 'llm_chat')}
                    disabled={!input.trim() || loading}
                    className="rounded-xl px-4 py-2 text-sm font-semibold btn-press disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                      color: 'var(--text-inverse)',
                    }}
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

// ── 6. Adherence Checklist (DB-backed) ────────────────────────────────────

type AdherenceAnswer = 'yes' | 'no';

interface AdherenceRow {
  id: number;
  userId: string;
  eventDate: string;
  checks: Record<string, AdherenceAnswer>;
  completedCount: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
}

const ADHERENCE_ITEMS: { id: string; label: string; icon: typeof Flame }[] = [
  { id: 'calories', label: 'Hit calorie range', icon: Flame },
  { id: 'protein', label: 'Hit protein target', icon: Beef },
  { id: 'walk', label: 'Walk after meals', icon: Footprints },
  { id: 'hydration', label: 'Hydration goal', icon: DropletIcon },
  { id: 'sleep', label: 'Sleep target', icon: Moon },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function AdherenceChecklist() {
  const [checks, setChecks] = useState<Record<string, AdherenceAnswer>>({});
  const [history, setHistory] = useState<AdherenceRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const from = dateNDaysAgo(13);
        const to = todayKey();
        const resp = await fetch(`/api/adherence?from=${from}&to=${to}`);
        if (!resp.ok) return;
        const rows = (await resp.json()) as AdherenceRow[];
        if (cancelled) return;
        setHistory(rows);
        const todayRow = rows.find((r) => r.eventDate === todayKey());
        if (todayRow) setChecks(todayRow.checks ?? {});
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = async (next: Record<string, AdherenceAnswer>) => {
    setSaving(true);
    try {
      const resp = await fetch('/api/adherence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayKey(),
          checks: next,
          totalCount: ADHERENCE_ITEMS.length,
        }),
      });
      if (resp.ok) {
        const row = (await resp.json()) as AdherenceRow;
        setHistory((prev) => {
          const without = prev.filter((r) => r.eventDate !== row.eventDate);
          return [row, ...without].sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));
        });
      }
    } catch {
      // optimistic UI keeps the local state; will reconcile on next load
    } finally {
      setSaving(false);
    }
  };

  const setAnswer = (id: string, answer: AdherenceAnswer) => {
    const next: Record<string, AdherenceAnswer> = { ...checks };
    if (next[id] === answer) {
      delete next[id];
    } else {
      next[id] = answer;
    }
    setChecks(next);
    void persist(next);
  };

  const completedToday = ADHERENCE_ITEMS.filter((i) => checks[i.id] === 'yes').length;
  const answeredToday = ADHERENCE_ITEMS.filter((i) => checks[i.id] !== undefined).length;
  const completedDays = history.filter((r) => r.totalCount > 0 && r.completedCount === r.totalCount).length;

  return (
    <Card>
      <SectionHeader
        icon={CheckCircle2}
        title="Today's checklist"
        action={saving ? <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Saving…</span> : undefined}
      />
      <AdherenceStrip history={history} />
      <div className="space-y-1.5 mt-3">
        {ADHERENCE_ITEMS.map((item) => {
          const Icon = item.icon;
          const answer = checks[item.id];
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{
                backgroundColor: answer === 'yes' ? 'var(--accent-subtle)' : 'var(--bg-warm)',
                border: `1px solid ${answer === 'yes' ? 'var(--accent)' : 'var(--border-light)'}`,
              }}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                {item.label}
              </span>
              <YesNoToggle
                value={answer}
                onChange={(v) => setAnswer(item.id, v)}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: AdherenceAnswer | undefined;
  onChange: (v: AdherenceAnswer) => void;
}) {
  return (
    <div
      className="flex flex-shrink-0 rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--border-light)' }}
    >
      <button
        type="button"
        onClick={() => onChange('yes')}
        aria-pressed={value === 'yes'}
        className="px-3 py-1 text-[11px] font-semibold cursor-pointer transition-colors"
        style={{
          backgroundColor: value === 'yes' ? 'var(--accent)' : 'var(--surface)',
          color: value === 'yes' ? 'var(--text-inverse)' : 'var(--text-secondary)',
        }}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange('no')}
        aria-pressed={value === 'no'}
        className="px-3 py-1 text-[11px] font-semibold cursor-pointer transition-colors"
        style={{
          backgroundColor: value === 'no' ? 'var(--text-tertiary)' : 'var(--surface)',
          color: value === 'no' ? 'var(--text-inverse)' : 'var(--text-secondary)',
          borderLeft: '1px solid var(--border-light)',
        }}
      >
        No
      </button>
    </div>
  );
}

function AdherenceStrip({ history }: { history: AdherenceRow[] }) {
  const byDate = new Map(history.map((r) => [r.eventDate, r]));
  const days: Array<{ date: string; ratio: number | null }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = dateNDaysAgo(i);
    const row = byDate.get(d);
    days.push({
      date: d,
      ratio: row && row.totalCount > 0 ? row.completedCount / row.totalCount : null,
    });
  }
  return (
    <div className="flex gap-1">
      {days.map((d) => {
        const filled = d.ratio !== null;
        const intensity = d.ratio ?? 0;
        const bg = !filled
          ? 'var(--bg-warm)'
          : intensity === 1
          ? 'var(--accent)'
          : intensity >= 0.6
          ? 'var(--accent-hover)'
          : intensity > 0
          ? 'var(--accent-subtle)'
          : 'var(--bg-warm)';
        return (
          <div
            key={d.date}
            title={`${d.date}: ${filled ? Math.round(intensity * 100) + '%' : 'no data'}`}
            className="flex-1 h-5 rounded"
            style={{
              backgroundColor: bg,
              border: '1px solid var(--border-light)',
              opacity: filled ? 1 : 0.5,
            }}
          />
        );
      })}
    </div>
  );
}

// ── 7. Recent History + nav ───────────────────────────────────────────────

function RecentHistory({ latest }: { latest: AnalysisHistory }) {
  const overall = Math.round(latest.result.healthScore.overall);
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Latest analysis
          </p>
          <h3 className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            Health score {overall} · {formatDate(new Date(latest.createdAt))}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/analyze" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>
            <Activity className="h-3 w-3" /> Re-run analysis
          </Link>
          <Link href="/history" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface)', border: '1.5px solid var(--border-light)', color: 'var(--text-secondary)' }}>
            <HistoryIcon className="h-3 w-3" /> Lab history
          </Link>
          <Link href="/coach-history" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface)', border: '1.5px solid var(--border-light)', color: 'var(--text-secondary)' }}>
            <MessageCircle className="h-3 w-3" /> Coach history
          </Link>
        </div>
      </div>
    </Card>
  );
}

// ── 8. Safety banner ──────────────────────────────────────────────────────

function SafetyBanner({ markers, profile }: { markers: BloodMarkers; profile: UserProfile }) {
  const critical = useMemo(() => findCriticalMarkers(markers, profile.gender), [markers, profile.gender]);
  if (critical.length === 0) return null;

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        backgroundColor: 'var(--status-warning-bg, var(--bg-warm))',
        border: '1px solid var(--status-warning-border, var(--border))',
      }}
    >
      <Stethoscope className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--status-danger)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Some markers are out of typical range
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {critical.map((c) => MARKER_NAMES[c] ?? c).join(', ')} — these results are informational; consider talking to your clinician.
        </p>
      </div>
    </div>
  );
}

function findCriticalMarkers(markers: BloodMarkers, gender: UserProfile['gender']): (keyof BloodMarkers)[] {
  const out: (keyof BloodMarkers)[] = [];
  for (const [key, value] of Object.entries(markers) as Array<[keyof BloodMarkers, number | undefined]>) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const interp = getMarkerInterpretation(key, value, gender);
    if (interp.status === 'critical') out.push(key);
  }
  return out;
}

function derivePriorityFallbackItems(result: AnalysisResult, markers: BloodMarkers): ActionPlanItem[] {
  const markerSpecific: ActionPlanItem[] = [];

  if (typeof markers.vitaminD === 'number' && Number.isFinite(markers.vitaminD) && markers.vitaminD < 30) {
    markerSpecific.push({
      id: 'home-fallback-vitamin-d',
      priority: 1,
      title: 'Raise low vitamin D',
      rationale: `Vitamin D is ${markers.vitaminD.toFixed(1)} ng/mL (below target). Aim to correct this first with consistent supplementation, safe sun exposure, and a recheck in 8-12 weeks.`,
      relatedMarkers: ['vitaminD'],
    });
  }

  const categoryCopy: Array<{
    key: keyof AnalysisResult['healthScore'];
    title: string;
    rationale: (score: number) => string;
  }> = [
    {
      key: 'metabolic',
      title: 'Stabilize blood sugar and insulin response',
      rationale: (score) => `Metabolic score is ${Math.round(score)}/100 — prioritize fiber-forward meals, fewer refined carbs, and consistent post-meal movement.`,
    },
    {
      key: 'cardiovascular',
      title: 'Improve cholesterol and heart-risk patterns',
      rationale: (score) => `Cardiovascular score is ${Math.round(score)}/100 — focus on lowering atherogenic lipids with better fat quality and regular aerobic activity.`,
    },
    {
      key: 'hormonal',
      title: 'Support thyroid and hormonal consistency',
      rationale: (score) => `Hormonal score is ${Math.round(score)}/100 — prioritize sleep regularity, stress reduction, and follow-up on thyroid-related markers.`,
    },
    {
      key: 'nutritional',
      title: 'Rebuild key nutrient status',
      rationale: (score) => `Nutritional score is ${Math.round(score)}/100 — prioritize correcting low vitamin and mineral markers (especially vitamin D, B12, ferritin, and iron when flagged).`,
    },
    {
      key: 'hepatic',
      title: 'Reduce liver stress signals',
      rationale: (score) => `Hepatic score is ${Math.round(score)}/100 — reduce alcohol load, improve food quality, and recheck liver markers after consistent habits.`,
    },
    {
      key: 'renal',
      title: 'Protect kidney-related markers',
      rationale: (score) => `Renal score is ${Math.round(score)}/100 — support hydration and blood pressure control, and monitor kidney markers over time.`,
    },
  ];

  const candidates = categoryCopy
    .map(({ key, title, rationale }) => ({
      key,
      title,
      rationale,
      score: result.healthScore[key],
    }))
    .filter((row) => typeof row.score === 'number' && Number.isFinite(row.score) && row.score > 0 && row.score < 85)
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.max(0, 3 - markerSpecific.length));

  const categoryItems: ActionPlanItem[] = candidates.map((row, idx) => ({
    id: `home-fallback-${row.key}-${markerSpecific.length + idx + 1}`,
    priority: (markerSpecific.length + idx + 1) as 1 | 2 | 3,
    title: row.title,
    rationale: row.rationale(row.score),
    relatedMarkers: [],
  }));

  return [...markerSpecific, ...categoryItems].slice(0, 3).map((item, idx) => ({
    ...item,
    priority: (idx + 1) as 1 | 2 | 3,
  }));
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyHome() {
  return (
    <main className="max-w-3xl mx-auto px-5 pt-12 pb-16">
      <div
        className="rounded-2xl p-8 text-center"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
          Welcome to BetterCals
        </h2>
        <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Run your first analysis to see calorie targets, blood marker insights, a personalized diet plan, and trends here.
        </p>
        <Link
          href="/analyze"
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          Start your first analysis
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function parseDislikes(text: string | undefined): string[] | undefined {
  if (!text) return undefined;
  const items = text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 40)
    .slice(0, 10);
  return items.length > 0 ? items : undefined;
}

function capitalize(value: string): string {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(d);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Apple is used via SLOT_ICON dynamic mapping; suppress unused warning.
void Apple;
