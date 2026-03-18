'use client';

import { MacroBreakdown } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MacroDonutChartProps {
  macros: MacroBreakdown;
}

const COLORS = {
  protein: '#a05a5a',
  carbs: '#b8860b',
  fat: '#6b8f71',
};

export default function MacroDonutChart({ macros }: MacroDonutChartProps) {
  const data = [
    { name: 'Protein', value: macros.protein.pct, grams: macros.protein.grams, color: COLORS.protein },
    { name: 'Carbs', value: macros.carbs.pct, grams: macros.carbs.grams, color: COLORS.carbs },
    { name: 'Fat', value: macros.fat.pct, grams: macros.fat.grams, color: COLORS.fat },
  ];

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
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Macro Breakdown</h3>
      </div>

      <div className="px-5 py-4">
        <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
              {macros.calories.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>cal/day</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {data.map((item) => (
            <div key={item.name} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {item.grams}g
              </span>
              <span className="text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>
                ({item.value}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
