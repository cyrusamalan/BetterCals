'use client';

import { HealthScore } from '@/types';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface HealthRadarChartProps {
  healthScore: HealthScore;
}

export default function HealthRadarChart({ healthScore }: HealthRadarChartProps) {
  const allData = [
    { axis: 'Metabolic', value: healthScore.metabolic },
    { axis: 'Cardiovascular', value: healthScore.cardiovascular },
    { axis: 'Hormonal', value: healthScore.hormonal },
    { axis: 'Nutritional', value: healthScore.nutritional },
    { axis: 'Hepatic', value: healthScore.hepatic },
    { axis: 'Renal', value: healthScore.renal },
  ];
  const data = allData.filter((d) => d.value > 0);

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
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Health Radar</h3>
      </div>

      <div className="px-5 py-4">
        <div className="h-[200px] sm:h-[240px]" style={{ width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e4e2dc" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fontSize: 11, fill: '#948e84' }}
              />
              <Radar
                dataKey="value"
                stroke="#6b8f71"
                fill="#6b8f71"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
