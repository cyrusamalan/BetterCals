'use client';

import type { BloodMarkers, UserProfile } from '@/types';
import { getMarkerDisplayRange, getMarkerInterpretation } from '@/lib/bloodParser';
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MarkerComparisonChartProps {
  markers: BloodMarkers;
  gender?: UserProfile['gender'];
}

const MARKER_SHORT: Record<keyof BloodMarkers, string> = {
  glucose: 'Glucose',
  hba1c: 'HbA1c',
  totalCholesterol: 'Tot Chol',
  nonHdl: 'Non-HDL',
  ldl: 'LDL',
  hdl: 'HDL',
  triglycerides: 'Trig',
  apoB: 'ApoB',
  hsCRP: 'hs-CRP',
  tsh: 'TSH',
  vitaminD: 'Vit D',
  vitaminB12: 'B12',
  ferritin: 'Ferritin',
  iron: 'Iron',
};

const STATUS_COLORS: Record<string, string> = {
  normal: '#5a7a62',
  optimal: '#3f7a5b',
  borderline: '#9c7a3c',
  low: '#4a6a8c',
  high: '#9c7a3c',
  critical: '#9c4a4a',
  unknown: '#8a857c',
};

export default function MarkerComparisonChart({ markers, gender }: MarkerComparisonChartProps) {
  const data = (Object.keys(markers) as (keyof BloodMarkers)[])
    .filter((key) => markers[key] !== undefined && getMarkerDisplayRange(key, gender))
    .map((key) => {
      const value = markers[key]!;
      const range = getMarkerDisplayRange(key, gender)!;
      const midpoint = (range.min + range.max) / 2;
      const pct = Math.round((value / midpoint) * 100);
      const interp = getMarkerInterpretation(key, value, gender);
      return {
        name: MARKER_SHORT[key],
        pct,
        fill: STATUS_COLORS[interp.status] || STATUS_COLORS.normal,
      };
    });

  if (data.length === 0) return null;

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
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Marker Comparison</h3>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>% of reference midpoint</p>
      </div>

      <div className="px-5 py-4">
        <div style={{ width: '100%', height: Math.max(200, data.length * 36) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#948e84' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#5c5850' }} width={60} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'of midpoint']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e2dc' }}
              />
              <ReferenceLine x={100} stroke="#e4e2dc" strokeDasharray="3 3" />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={14}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
