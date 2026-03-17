'use client';

import { HealthScore } from '@/types';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface HealthScoreCardProps {
  score: HealthScore;
}

export default function HealthScoreCard({ score }: HealthScoreCardProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return '#16a34a'; // green-600
    if (value >= 60) return '#eab308'; // yellow-500
    if (value >= 40) return '#f97316'; // orange-500
    return '#dc2626'; // red-600
  };

  const categories = [
    { name: 'Metabolic', value: score.metabolic },
    { name: 'Cardiovascular', value: score.cardiovascular },
    { name: 'Hormonal', value: score.hormonal },
    { name: 'Nutritional', value: score.nutritional },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Health Score
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Overall Score */}
        <div className="w-32 h-32">
          <CircularProgressbar
            value={score.overall}
            text={`${score.overall}`}
            styles={buildStyles({
              pathColor: getScoreColor(score.overall),
              textColor: getScoreColor(score.overall),
              trailColor: '#e5e7eb',
            })}
          />
          <p className="text-center text-sm font-medium text-gray-600 mt-2">Overall</p>
        </div>

        {/* Category Scores */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <div key={category.name} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{category.name}</span>
                <span 
                  className="font-medium"
                  style={{ color: getScoreColor(category.value) }}
                >
                  {category.value}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${category.value}%`,
                    backgroundColor: getScoreColor(category.value),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
