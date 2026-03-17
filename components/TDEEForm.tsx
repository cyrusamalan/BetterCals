'use client';

import { useForm, useWatch } from 'react-hook-form';
import { UserProfile, ActivityLevel } from '@/types';

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
  const { register, handleSubmit, formState: { errors }, control } = useForm<FormData>({
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
      weightLbs: 154, // ~70kg
      heightFeet: 5,
      heightInches: 7, // ~170cm
      activityLevel: 'moderate',
      goal: 'maintain',
    },
  });

  const handleFormSubmit = (data: FormData) => {
    console.log('📋 Form submitted with data:', data);
    const profileToSubmit = {
      age: data.age,
      gender: data.gender,
      weightLbs: data.weightLbs,
      heightFeet: data.heightFeet,
      heightInches: data.heightInches,
      activityLevel: data.activityLevel,
      goal: data.goal,
    };
    console.log('👤 Submitting profile:', profileToSubmit);
    onSubmit(profileToSubmit);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age
          </label>
          <input
            type="number"
            {...register('age', { required: 'Age is required', min: 13, max: 120, valueAsNumber: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="30"
          />
          {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender
          </label>
          <select
            {...register('gender', { required: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weight (lbs)
          </label>
          <input
            type="number"
            step="0.1"
            {...register('weightLbs', { required: 'Weight is required', min: 40, max: 700, valueAsNumber: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="154"
          />
          {errors.weightLbs && <p className="mt-1 text-sm text-red-600">{errors.weightLbs.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Height
          </label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <input
                type="number"
                {...register('heightFeet', { required: true, min: 1, max: 8, valueAsNumber: true })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="5"
              />
              <span className="text-xs text-gray-500">ft</span>
            </div>
            <div className="flex-1">
              <input
                type="number"
                {...register('heightInches', { required: true, min: 0, max: 11, valueAsNumber: true })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="7"
              />
              <span className="text-xs text-gray-500">in</span>
            </div>
          </div>
          {errors.heightFeet && <p className="mt-1 text-sm text-red-600">{errors.heightFeet.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Activity Level
          </label>
          <select
            {...register('activityLevel', { required: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="sedentary">Sedentary (little/no exercise)</option>
            <option value="light">Lightly Active (1-3 days/week)</option>
            <option value="moderate">Moderately Active (3-5 days/week)</option>
            <option value="active">Very Active (6-7 days/week)</option>
            <option value="very-active">Extremely Active (physical job/training)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Goal
          </label>
          <select
            {...register('goal', { required: true })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="lose">Lose Weight (20% deficit)</option>
            <option value="maintain">Maintain Weight</option>
            <option value="gain">Gain Muscle (10% surplus)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
      >
        Calculate Calories
      </button>
    </form>
  );
}
