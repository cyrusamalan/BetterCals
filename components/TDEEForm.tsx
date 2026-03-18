'use client';

import { useForm } from 'react-hook-form';
import { UserProfile, ActivityLevel } from '@/types';
import { ArrowRight, User, Ruler, Weight, Zap, Target } from 'lucide-react';

interface TDEEFormProps {
  onSubmit: (profile: UserProfile) => void;
  initialValues?: UserProfile;
}

interface FormData {
  age: number;
  gender: 'male' | 'female';
  weightLbs: number;
  heightFeet: number;
  heightInches: number;
  activityLevel: ActivityLevel;
  goal: 'lose' | 'maintain' | 'gain';
}

export default function TDEEForm({ onSubmit, initialValues }: TDEEFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: initialValues ? {
      age: initialValues.age,
      gender: initialValues.gender,
      weightLbs: initialValues.weightLbs,
      heightFeet: initialValues.heightFeet,
      heightInches: initialValues.heightInches,
      activityLevel: initialValues.activityLevel,
      goal: initialValues.goal,
    } : {
      age: 30,
      gender: 'male',
      weightLbs: 154,
      heightFeet: 5,
      heightInches: 7,
      activityLevel: 'moderate',
      goal: 'maintain',
    },
  });

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      age: data.age,
      gender: data.gender,
      weightLbs: data.weightLbs,
      heightFeet: data.heightFeet,
      heightInches: data.heightInches,
      activityLevel: data.activityLevel,
      goal: data.goal,
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

      {/* Row 3: Activity + Goal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FieldGroup icon={Zap} label="Activity Level">
          <select
            {...register('activityLevel', { required: true })}
            className="select-field"
          >
            <option value="sedentary">Sedentary (little/no exercise)</option>
            <option value="light">Lightly Active (1-3 days/wk)</option>
            <option value="moderate">Moderate (3-5 days/wk)</option>
            <option value="active">Very Active (6-7 days/wk)</option>
            <option value="very-active">Extremely Active (physical job)</option>
          </select>
        </FieldGroup>

        <FieldGroup icon={Target} label="Goal">
          <select
            {...register('goal', { required: true })}
            className="select-field"
          >
            <option value="lose">Lose Weight (-20%)</option>
            <option value="maintain">Maintain Weight</option>
            <option value="gain">Build Muscle (+10%)</option>
          </select>
        </FieldGroup>
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
