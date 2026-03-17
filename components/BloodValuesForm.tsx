'use client';

import { useForm } from 'react-hook-form';
import { BloodMarkers } from '@/types';

interface BloodValuesFormProps {
  onSubmit: (markers: BloodMarkers) => void;
  initialValues?: BloodMarkers;
}

export default function BloodValuesForm({ onSubmit, initialValues }: BloodValuesFormProps) {
  const { register, handleSubmit } = useForm<BloodMarkers>({
    defaultValues: initialValues || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Glucose (mg/dL)
          </label>
          <input
            type="number"
            step="0.1"
            {...register('glucose', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="90"
          />
          <p className="text-xs text-gray-500 mt-1">Normal: 70-99</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HbA1c (%)
          </label>
          <input
            type="number"
            step="0.1"
            {...register('hba1c', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="5.4"
          />
          <p className="text-xs text-gray-500 mt-1">Normal: 4.0-5.6</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Cholesterol (mg/dL)
          </label>
          <input
            type="number"
            {...register('totalCholesterol', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="180"
          />
          <p className="text-xs text-gray-500 mt-1">Normal: &lt;200</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LDL (mg/dL)
          </label>
          <input
            type="number"
            {...register('ldl', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="100"
          />
          <p className="text-xs text-gray-500 mt-1">Optimal: &lt;100</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HDL (mg/dL)
          </label>
          <input
            type="number"
            {...register('hdl', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="60"
          />
          <p className="text-xs text-gray-500 mt-1">Good: &gt;60</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Triglycerides (mg/dL)
          </label>
          <input
            type="number"
            {...register('triglycerides', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="120"
          />
          <p className="text-xs text-gray-500 mt-1">Normal: &lt;150</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TSH (mIU/L)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('tsh', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="2.0"
          />
          <p className="text-xs text-gray-500 mt-1">Normal: 0.5-4.0</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vitamin D (ng/mL)
          </label>
          <input
            type="number"
            {...register('vitaminD', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="30"
          />
          <p className="text-xs text-gray-500 mt-1">Optimal: 30-100</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vitamin B12 (pg/mL)
          </label>
          <input
            type="number"
            {...register('vitaminB12', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="400"
          />
          <p className="text-xs text-gray-500 mt-1">Normal: 300-900</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ferritin (ng/mL)
          </label>
          <input
            type="number"
            {...register('ferritin', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="50"
          />
          <p className="text-xs text-gray-500 mt-1">Normal: 30-300</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Iron (mcg/dL)
          </label>
          <input
            type="number"
            {...register('iron', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="80"
          />
          <p className="text-xs text-gray-500 mt-1">Normal: 60-170</p>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blood-600 hover:bg-blood-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Analyze Blood Values
      </button>
    </form>
  );
}
