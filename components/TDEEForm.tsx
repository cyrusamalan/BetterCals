'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserProfile, ActivityLevel, OccupationType, ExerciseTemplate, FocusGoal, DietaryPattern, MenstrualStatus } from '@/types';
import { ArrowRight, User, Ruler, Weight, Zap, Target, Activity, TrendingDown, Minus, TrendingUp, ChevronDown, Footprints, Briefcase, Dumbbell, Heart, Brain, Wind, Clock, Sparkles, Wine } from 'lucide-react';

interface TDEEFormProps {
  onSubmit: (profile: UserProfile) => void;
  initialValues?: UserProfile;
}

interface FormData {
  age: number;
  gender: 'male' | 'female';
  race?: 'white' | 'black' | 'other';
  weightLbs: number;
  heightFeet: number;
  heightInches: number;
  activityLevel: ActivityLevel;
  goal: 'lose-aggressive' | 'lose-moderate' | 'lose-mild' | 'maintain' | 'gain-lean' | 'gain-aggressive';
  smoker?: boolean;
  diabetic?: boolean;
  bloodPressureSystolic?: number;
  treatedForHypertension?: boolean;
  alcoholDrinksPerWeek?: number;
  familyHeartDisease?: boolean;
  takingHRT?: boolean;
  chronicKidneyDisease?: boolean;
  waistInches?: number;
  hipInches?: number;
  bodyFatPercentage?: number;
  // Advanced activity
  dailySteps?: number;
  occupationType?: OccupationType;
  exerciseTemplate?: ExerciseTemplate;
  customExerciseDays?: number;
  customExerciseMinutes?: number;
  // Enhanced goals
  focusGoal?: FocusGoal[];
  // Lifestyle context
  sleepHoursAvg?: number;
  stressLevel?: 'low' | 'moderate' | 'high' | 'very-high';
  dietaryPattern?: DietaryPattern;
  menstrualStatus?: MenstrualStatus;
  takingStatins?: boolean;
  takingThyroidMeds?: boolean;
}

function coerceFocusGoals(
  v: FocusGoal | FocusGoal[] | string | undefined,
): FocusGoal[] {
  if (v === undefined) return [];
  if (typeof v === 'string') return [v as FocusGoal];
  if (Array.isArray(v)) return v;
  return [];
}

export default function TDEEForm({ onSubmit, initialValues }: TDEEFormProps) {
  const [advancedActivity, setAdvancedActivity] = useState(initialValues?.advancedActivity ?? false);
  const [lifestyleOpen, setLifestyleOpen] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: initialValues ? {
      age: initialValues.age,
      gender: initialValues.gender,
      weightLbs: initialValues.weightLbs,
      heightFeet: initialValues.heightFeet,
      heightInches: initialValues.heightInches,
      activityLevel: initialValues.activityLevel,
      goal: initialValues.goal,
      race: initialValues.race,
      smoker: initialValues.smoker ?? false,
      diabetic: initialValues.diabetic ?? false,
      bloodPressureSystolic: initialValues.bloodPressureSystolic,
      treatedForHypertension: initialValues.treatedForHypertension ?? false,
      alcoholDrinksPerWeek: initialValues.alcoholDrinksPerWeek,
      familyHeartDisease: initialValues.familyHeartDisease ?? false,
      takingHRT: initialValues.takingHRT ?? false,
      chronicKidneyDisease: initialValues.chronicKidneyDisease ?? false,
      waistInches: initialValues.waistInches,
      hipInches: initialValues.hipInches,
      bodyFatPercentage: initialValues.bodyFatPercentage,
      dailySteps: initialValues.dailySteps,
      occupationType: initialValues.occupationType,
      exerciseTemplate: initialValues.exerciseTemplate,
      focusGoal: coerceFocusGoals(initialValues.focusGoal as FocusGoal | FocusGoal[] | string | undefined),
      sleepHoursAvg: initialValues.sleepHoursAvg,
      stressLevel: initialValues.stressLevel,
      dietaryPattern: initialValues.dietaryPattern,
      menstrualStatus: initialValues.menstrualStatus,
      takingStatins: initialValues.takingStatins ?? false,
      takingThyroidMeds: initialValues.takingThyroidMeds ?? false,
    } : {
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'maintain' as const,
      smoker: false,
      diabetic: false,
      treatedForHypertension: false,
      takingStatins: false,
      takingThyroidMeds: false,
      focusGoal: [],
    },
  });

  const selectedGender = watch('gender');
  const selectedExerciseTemplate = watch('exerciseTemplate');

  const handleFormSubmit = (data: FormData) => {
    const optNum = (v: number | undefined): number | undefined =>
      typeof v === 'number' && Number.isFinite(v) ? v : undefined;

    // Build exercise sessions from custom input if template is 'custom'
    const exerciseSessions = data.exerciseTemplate === 'custom' && optNum(data.customExerciseDays) && optNum(data.customExerciseMinutes)
      ? [{ type: 'cardio-moderate' as const, durationMinutes: data.customExerciseMinutes!, frequencyPerWeek: data.customExerciseDays! }]
      : undefined;

    onSubmit({
      age: data.age,
      gender: data.gender,
      race: data.race || undefined,
      weightLbs: data.weightLbs,
      heightFeet: data.heightFeet,
      heightInches: data.heightInches,
      activityLevel: data.activityLevel,
      goal: data.goal,
      smoker: data.smoker,
      diabetic: data.diabetic,
      bloodPressureSystolic: optNum(data.bloodPressureSystolic),
      treatedForHypertension: data.treatedForHypertension,
      alcoholDrinksPerWeek: optNum(data.alcoholDrinksPerWeek),
      familyHeartDisease: data.familyHeartDisease,
      takingHRT: data.takingHRT,
      chronicKidneyDisease: data.chronicKidneyDisease,
      waistInches: optNum(data.waistInches),
      hipInches: optNum(data.hipInches),
      bodyFatPercentage: optNum(data.bodyFatPercentage),
      // Advanced activity
      advancedActivity,
      dailySteps: advancedActivity ? optNum(data.dailySteps) : undefined,
      occupationType: advancedActivity ? (data.occupationType || undefined) : undefined,
      exerciseTemplate: advancedActivity ? (data.exerciseTemplate || undefined) : undefined,
      exerciseSessions: advancedActivity ? exerciseSessions : undefined,
      // Enhanced goals
      focusGoal: data.focusGoal && data.focusGoal.length > 0 ? data.focusGoal : undefined,
      // Lifestyle context
      sleepHoursAvg: optNum(data.sleepHoursAvg),
      stressLevel: data.stressLevel || undefined,
      dietaryPattern: data.dietaryPattern || undefined,
      menstrualStatus: data.menstrualStatus || undefined,
      takingStatins: data.takingStatins,
      takingThyroidMeds: data.takingThyroidMeds,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-7">
      {/* Row 1: Age + Gender */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FieldGroup icon={User} label="Age" error={errors.age?.message}>
          <input
            type="number"
            {...register('age', { required: 'Age is required', min: 13, max: 120, valueAsNumber: true })}
            className="input-field"
            placeholder="30"
          />
        </FieldGroup>

        <FieldGroup icon={User} label="Gender">
          <select
            {...register('gender', { required: true })}
            className="select-field"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </FieldGroup>
      </div>

      {/* Row 2: Weight + Height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FieldGroup icon={Weight} label="Weight" error={errors.weightLbs?.message}>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              {...register('weightLbs', { required: 'Weight is required', min: 40, max: 700, valueAsNumber: true })}
              className="input-field pr-12"
              placeholder="154"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              lbs
            </span>
          </div>
        </FieldGroup>

        <FieldGroup icon={Ruler} label="Height" error={errors.heightFeet?.message}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                {...register('heightFeet', { required: true, min: 1, max: 8, valueAsNumber: true })}
                className="input-field pr-8"
                placeholder="5"
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: 'var(--text-tertiary)' }}
              >
                ft
              </span>
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                {...register('heightInches', { required: true, min: 0, max: 11, valueAsNumber: true })}
                className="input-field pr-8"
                placeholder="7"
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: 'var(--text-tertiary)' }}
              >
                in
              </span>
            </div>
          </div>
        </FieldGroup>
      </div>

      {/* Row 2b: Body Composition (Optional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        <FieldGroup icon={Ruler} label="Waist (optional)">
          <div className="relative">
            <input
              type="number"
              step="0.5"
              {...register('waistInches', { min: 15, max: 80, valueAsNumber: true })}
              className="input-field pr-12"
              placeholder="32"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              in
            </span>
          </div>
        </FieldGroup>

        <FieldGroup icon={Ruler} label="Hip (optional)">
          <div className="relative">
            <input
              type="number"
              step="0.5"
              {...register('hipInches', { min: 20, max: 80, valueAsNumber: true })}
              className="input-field pr-12"
              placeholder="38"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              in
            </span>
          </div>
        </FieldGroup>

        <FieldGroup icon={Activity} label="Body Fat % (optional)">
          <div className="relative">
            <input
              type="number"
              step="0.1"
              {...register('bodyFatPercentage', { min: 3, max: 60, valueAsNumber: true })}
              className="input-field pr-12"
              placeholder="20"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              %
            </span>
          </div>
        </FieldGroup>
      </div>

      {/* Row 3: Activity Level */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Activity Level
            </span>
          </label>
          <button
            type="button"
            onClick={() => setAdvancedActivity(!advancedActivity)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200"
            style={{
              backgroundColor: advancedActivity ? 'var(--accent)' : 'var(--bg-warm)',
              color: advancedActivity ? 'var(--text-inverse)' : 'var(--text-tertiary)',
              border: `1px solid ${advancedActivity ? 'var(--accent)' : 'var(--border-light)'}`,
            }}
          >
            Advanced
          </button>
        </div>

        {!advancedActivity ? (
          <select
            {...register('activityLevel', { required: true })}
            className="select-field"
          >
            <option value="sedentary">Sedentary (little/no exercise)</option>
            <option value="light">Lightly Active (1-3 days/wk)</option>
            <option value="moderate">Moderately Active (3-5 days/wk)</option>
            <option value="active">Very Active (6-7 days/wk)</option>
            <option value="very-active">Extra Active (physical job + exercise)</option>
          </select>
        ) : (
          <div
            className="rounded-xl p-4 space-y-4"
            style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
          >
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              More precise TDEE — enter your daily movement and exercise details.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup icon={Footprints} label="Daily Steps">
                <input
                  type="number"
                  {...register('dailySteps', { min: 1000, max: 30000, valueAsNumber: true })}
                  className="input-field"
                  placeholder="8000"
                />
              </FieldGroup>

              <FieldGroup icon={Briefcase} label="Occupation Type">
                <select {...register('occupationType')} className="select-field">
                  <option value="">— Select —</option>
                  <option value="desk">Desk / Office</option>
                  <option value="standing">Standing (retail, teaching)</option>
                  <option value="light-labor">Light Labor (nursing, cleaning)</option>
                  <option value="heavy-labor">Heavy Labor (construction, warehouse)</option>
                </select>
              </FieldGroup>
            </div>

            {/* Exercise Template Selector */}
            <div>
              <label className="flex items-center gap-1.5 mb-2">
                <Dumbbell className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Exercise Routine
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EXERCISE_TEMPLATE_OPTIONS.map((opt) => {
                  const selected = selectedExerciseTemplate === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('exerciseTemplate', opt.value)}
                      className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-all duration-200 cursor-pointer"
                      style={{
                        backgroundColor: selected ? 'var(--status-normal-bg, #f0fdf4)' : 'var(--surface)',
                        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
                      }}
                    >
                      <span className="text-xs font-semibold" style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom exercise fields */}
              {selectedExerciseTemplate === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <FieldGroup icon={Activity} label="Days / Week">
                    <input
                      type="number"
                      {...register('customExerciseDays', { min: 1, max: 7, valueAsNumber: true })}
                      className="input-field"
                      placeholder="4"
                    />
                  </FieldGroup>
                  <FieldGroup icon={Clock} label="Avg. Session (min)">
                    <input
                      type="number"
                      {...register('customExerciseMinutes', { min: 10, max: 180, valueAsNumber: true })}
                      className="input-field"
                      placeholder="45"
                    />
                  </FieldGroup>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Goal Selection Cards */}
      <GoalSelector value={watch('goal')} onChange={(g) => setValue('goal', g)} />

      {/* Focus Goal Pills */}
      <FocusGoalSelector value={watch('focusGoal') ?? []} onChange={(goals) => setValue('focusGoal', goals)} />

      {/* Lifestyle Context (collapsible) */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-warm)',
          border: '1px solid var(--border-light)',
        }}
      >
        <button
          type="button"
          onClick={() => setLifestyleOpen(!lifestyleOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Personalize Further
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Sleep, stress, diet, and medications — improves supplement and exercise recommendations.
            </p>
          </div>
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
            style={{
              color: 'var(--text-tertiary)',
              transform: lifestyleOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {lifestyleOpen && (
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup icon={Activity} label="Dietary Pattern">
                <select {...register('dietaryPattern')} className="select-field">
                  <option value="">— Select (optional) —</option>
                  <option value="omnivore">Omnivore</option>
                  <option value="pescatarian">Pescatarian</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="low-carb">Low Carb</option>
                </select>
              </FieldGroup>

              <FieldGroup icon={Activity} label="Avg. Sleep (hours)">
                <input
                  type="number"
                  step="0.5"
                  {...register('sleepHoursAvg', { min: 4, max: 12, valueAsNumber: true })}
                  className="input-field"
                  placeholder="7"
                />
              </FieldGroup>
            </div>

            {/* Stress level pills */}
            <div>
              <label className="flex items-center gap-1.5 mb-2">
                <Brain className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Stress Level
                </span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {STRESS_OPTIONS.map((opt) => {
                  const selected = watch('stressLevel') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('stressLevel', selected ? undefined : opt.value as FormData['stressLevel'])}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Menstrual status — only shown for female */}
              {selectedGender === 'female' && (
                <FieldGroup icon={Activity} label="Menstrual Status">
                  <select {...register('menstrualStatus')} className="select-field">
                    <option value="">— Select (optional) —</option>
                    <option value="regular">Regular Cycle</option>
                    <option value="irregular">Irregular Cycle</option>
                    <option value="postmenopausal">Postmenopausal</option>
                  </select>
                </FieldGroup>
              )}
            </div>

            {/* Medications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Taking Statins</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Cholesterol medication</p>
                </div>
                <input
                  type="checkbox"
                  {...register('takingStatins')}
                  className="h-5 w-5 accent-[color:var(--accent)]"
                  aria-label="Taking statins"
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Thyroid Medication</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Levothyroxine, etc.</p>
                </div>
                <input
                  type="checkbox"
                  {...register('takingThyroidMeds')}
                  className="h-5 w-5 accent-[color:var(--accent)]"
                  aria-label="Taking thyroid medication"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 4: Clinical History (ASCVD) */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--bg-warm)',
          border: '1px solid var(--border-light)',
        }}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Clinical History (ASCVD)
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Optional — improves 10-year ASCVD risk estimate.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldGroup icon={User} label="Race">
            <select {...register('race')} className="select-field">
              <option value="">— Select (optional) —</option>
              <option value="white">White</option>
              <option value="black">Black / African American</option>
              <option value="other">Other</option>
            </select>
          </FieldGroup>

          <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Smoker</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Currently smokes cigarettes</p>
            </div>
            <input
              type="checkbox"
              {...register('smoker')}
              className="h-5 w-5 accent-[color:var(--accent)]"
              aria-label="Smoker"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Diabetes</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Diagnosed diabetes</p>
            </div>
            <input
              type="checkbox"
              {...register('diabetic')}
              className="h-5 w-5 accent-[color:var(--accent)]"
              aria-label="Diabetic"
            />
          </div>

          <FieldGroup icon={Activity} label="Systolic Blood Pressure" error={errors.bloodPressureSystolic?.message}>
            <input
              type="number"
              {...register('bloodPressureSystolic', { min: 70, max: 250, valueAsNumber: true })}
              className="input-field"
              placeholder="e.g., 120"
            />
          </FieldGroup>

          <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Treated for hypertension</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>On BP medication</p>
            </div>
            <input
              type="checkbox"
              {...register('treatedForHypertension')}
              className="h-5 w-5 accent-[color:var(--accent)]"
              aria-label="Treated for hypertension"
            />
          </div>

          <FieldGroup icon={Wine} label="Alcohol (drinks/week)">
            <input
              type="number"
              min={0}
              max={50}
              {...register('alcoholDrinksPerWeek', { min: 0, max: 50, valueAsNumber: true })}
              className="input-field"
              placeholder="0"
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
              1 drink = 12oz beer, 5oz wine, 1.5oz spirits
            </p>
          </FieldGroup>

          <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Family history of heart disease</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                First-degree relative (parent/sibling) diagnosed before age 55 (male) or 65 (female)
              </p>
            </div>
            <input
              type="checkbox"
              {...register('familyHeartDisease')}
              className="h-5 w-5 accent-[color:var(--accent)]"
              aria-label="Family history of premature heart disease"
            />
          </div>

          {selectedGender === 'female' && (
            <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 sm:col-span-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Hormone Replacement Therapy</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Estrogen or combined HRT</p>
              </div>
              <input
                type="checkbox"
                {...register('takingHRT')}
                className="h-5 w-5 accent-[color:var(--accent)]"
                aria-label="Taking hormone replacement therapy"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 sm:col-span-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chronic Kidney Disease (CKD)</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Diagnosed by a physician</p>
            </div>
            <input
              type="checkbox"
              {...register('chronicKidneyDisease')}
              className="h-5 w-5 accent-[color:var(--accent)]"
              aria-label="Chronic kidney disease"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold btn-press group"
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--text-inverse)',
          boxShadow: '0 2px 8px rgba(107, 143, 113, 0.3)',
        }}
      >
        Continue to Blood Report
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
      </button>
    </form>
  );
}

const GOAL_OPTIONS: {
  value: FormData['goal'];
  label: string;
  desc: string;
  detail: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    value: 'lose-aggressive',
    label: 'Aggressive Cut',
    desc: '-30% calories',
    detail: 'Fast results, higher protein to protect muscle',
    icon: TrendingDown,
    color: 'var(--status-danger)',
    bgColor: 'var(--status-danger-bg, #fef2f2)',
    borderColor: 'var(--status-danger-border, #fecaca)',
  },
  {
    value: 'lose-moderate',
    label: 'Moderate Cut',
    desc: '-20% calories',
    detail: 'Recommended for sustainable fat loss',
    icon: TrendingDown,
    color: 'var(--status-warning, #d97706)',
    bgColor: 'var(--status-warning-bg, #fffbeb)',
    borderColor: 'var(--status-warning-border, #fde68a)',
  },
  {
    value: 'lose-mild',
    label: 'Mild Cut',
    desc: '-10% calories',
    detail: 'Slow & steady, minimal metabolic stress',
    icon: TrendingDown,
    color: 'var(--accent-warm, #b45309)',
    bgColor: '#fdf8f0',
    borderColor: '#f5e6d0',
  },
  {
    value: 'maintain',
    label: 'Maintain',
    desc: '0% change',
    detail: 'Sustain current weight and body composition',
    icon: Minus,
    color: 'var(--accent)',
    bgColor: 'var(--status-normal-bg, #f0fdf4)',
    borderColor: 'var(--status-normal-border, #bbf7d0)',
  },
  {
    value: 'gain-lean',
    label: 'Lean Bulk',
    desc: '+10% calories',
    detail: 'Minimize fat gain while adding muscle',
    icon: TrendingUp,
    color: 'var(--status-info, #2563eb)',
    bgColor: 'var(--status-info-bg, #eff6ff)',
    borderColor: 'var(--status-info-border, #bfdbfe)',
  },
  {
    value: 'gain-aggressive',
    label: 'Aggressive Bulk',
    desc: '+20% calories',
    detail: 'Maximize muscle gain, higher carbs for training',
    icon: TrendingUp,
    color: 'var(--status-info, #2563eb)',
    bgColor: 'var(--status-info-bg, #eff6ff)',
    borderColor: 'var(--status-info-border, #bfdbfe)',
  },
];

function GoalSelector({ value, onChange }: { value: FormData['goal']; onChange: (g: FormData['goal']) => void }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 mb-3">
        <Target className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          What&apos;s Your Goal?
        </span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {GOAL_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="relative flex flex-col items-start gap-1.5 rounded-xl px-3.5 py-3 text-left transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: selected ? opt.bgColor : 'var(--surface)',
                border: `1.5px solid ${selected ? opt.borderColor : 'var(--border-light)'}`,
                boxShadow: selected ? `0 0 0 1px ${opt.borderColor}` : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: selected ? opt.borderColor : 'var(--bg-warm)' }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: selected ? opt.color : 'var(--text-tertiary)' }} />
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: selected ? opt.color : 'var(--text-primary)' }}
                >
                  {opt.label}
                </span>
              </div>
              <span className="text-[11px] font-medium" style={{ color: selected ? opt.color : 'var(--text-tertiary)' }}>
                {opt.desc}
              </span>
              <span className="text-[10px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                {opt.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const EXERCISE_TEMPLATE_OPTIONS: { value: ExerciseTemplate; label: string; desc: string }[] = [
  { value: 'strength-focused', label: 'Strength Focused', desc: '4x strength, 1x cardio' },
  { value: 'cardio-focused', label: 'Cardio Focused', desc: '2x strength, 3x cardio' },
  { value: 'balanced', label: 'Balanced', desc: '3x strength, 2x cardio' },
  { value: 'light-recovery', label: 'Light / Recovery', desc: '2x flexibility, 2x light cardio' },
  { value: 'athlete', label: 'Athlete', desc: '3x strength, 2x HIIT, 1x sport' },
  { value: 'custom', label: 'Custom', desc: 'Enter your own details' },
];

const FOCUS_GOAL_OPTIONS: { value: FocusGoal; label: string; icon: React.ElementType }[] = [
  { value: 'fat-loss', label: 'Fat Loss', icon: TrendingDown },
  { value: 'muscle-gain', label: 'Muscle Gain', icon: Dumbbell },
  { value: 'metabolic-health', label: 'Metabolic Health', icon: Heart },
  { value: 'endurance', label: 'Endurance', icon: Wind },
  { value: 'longevity', label: 'Longevity', icon: Clock },
  { value: 'general-wellness', label: 'General Wellness', icon: Sparkles },
];

const STRESS_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'very-high', label: 'Very High' },
];

function FocusGoalSelector({ value, onChange }: { value: FocusGoal[]; onChange: (goals: FocusGoal[]) => void }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          What&apos;s Your Focus? <span className="font-normal normal-case">(optional, multi-select)</span>
        </span>
      </label>
      <div className="flex gap-2 flex-wrap">
        {FOCUS_GOAL_OPTIONS.map((opt) => {
          const selected = value.includes(opt.value);
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (selected) {
                  onChange(value.filter((g) => g !== opt.value));
                } else {
                  onChange([...value, opt.value]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: selected ? 'var(--accent)' : 'var(--surface)',
                color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-light)'}`,
              }}
            >
              <Icon className="w-3 h-3" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldGroup({
  icon: Icon,
  label,
  error,
  children,
}: {
  icon: React.ElementType;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs font-medium" style={{ color: 'var(--status-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
