'use client';

import { TDEEResult } from '@/types';
import { Flame, Target, Activity } from 'lucide-react';

interface TDEEResultCardProps {
  result: TDEEResult;
}

export default function TDEEResultCard({ result }: TDEEResultCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Your Calorie Results
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BMR */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-600">BMR</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{result.bmr.toLocaleString()}</p>
          <p className="text-xs text-gray-500">calories/day at rest</p>
        </div>

        {/* TDEE */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-5 h-5 text-primary-500" />
            <span className="text-sm font-medium text-gray-600">TDEE</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{result.tdee.toLocaleString()}</p>
          <p className="text-xs text-gray-500">calories/day with activity</p>
        </div>

        {/* Target */}
        <div className="bg-primary-50 rounded-lg p-4 border-2 border-primary-200">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">Target</span>
          </div>
          <p className="text-3xl font-bold text-primary-700">{result.targetCalories.toLocaleString()}</p>
          <p className="text-xs text-primary-600">recommended daily intake</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Activity multiplier:</strong> {result.activityMultiplier}x
        </p>
      </div>
    </div>
  );
}
