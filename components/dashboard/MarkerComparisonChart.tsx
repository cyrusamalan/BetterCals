'use client';

import type { BloodMarkers, UserProfile } from '@/types';
import { getMarkerDisplayRange, getMarkerInterpretation, getMarkerTiers } from '@/lib/bloodParser';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceArea,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Customized,
} from 'recharts';

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
  alt: 'ALT',
  ast: 'AST',
  albumin: 'Albumin',
  creatinine: 'Creat',
  uricAcid: 'Uric Acid',
  fastingInsulin: 'Insulin',
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
  const keys = (Object.keys(markers) as (keyof BloodMarkers)[]);
  const data = keys
    .filter((key) => markers[key] !== undefined && getMarkerDisplayRange(key, gender))
    .map((key) => {
      const value = markers[key]!;
      const range = getMarkerDisplayRange(key, gender)!;
      const midpoint = (range.min + range.max) / 2;
      const pct = Math.round((value / midpoint) * 100);
      const interp = getMarkerInterpretation(key, value, gender);
      return {
        key,
        name: MARKER_SHORT[key],
        pct,
        fill: STATUS_COLORS[interp.status] || STATUS_COLORS.normal,
      };
    });

  if (data.length === 0) return null;

  const pctMax = Math.max(...data.map((d) => d.pct), 140);
  const bellCurveMax = Math.ceil(pctMax / 10) * 10;

  const median = (nums: number[]) => {
    if (nums.length === 0) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
  };

  // Approximate reference zone bands (optimal/normal/high) in % of midpoint space.
  // We derive each band's ratio bounds per-marker from tier min/max, then take a median across markers.
  const zoneBands = (() => {
    const samples: Array<{
      optimalMinPct: number;
      optimalMaxPct: number;
      normalMinPct: number;
      normalMaxPct: number;
      highMinPct: number;
      highMaxPct: number;
    }> = [];

    for (const d of data) {
      const range = getMarkerDisplayRange(d.key, gender);
      if (!range) continue;
      const midpoint = (range.min + range.max) / 2;
      if (!(midpoint > 0)) continue;

      const tiers = getMarkerTiers(d.key, gender);
      if (!tiers.length) continue;

      const optimalTier = tiers.find((t) => t.status === 'optimal');
      const normalTier = tiers.find((t) => t.status === 'normal');
      if (!optimalTier || !normalTier) continue;

      const highTiers = tiers.filter((t) => t.status === 'borderline' || t.status === 'high' || t.status === 'critical');
      if (!highTiers.length) continue;

      const optimalMinPct = (optimalTier.min / midpoint) * 100;
      const optimalMaxPct = (optimalTier.max / midpoint) * 100;
      const normalMinPct = (normalTier.min / midpoint) * 100;
      const normalMaxPct = (normalTier.max / midpoint) * 100;
      const highMin = Math.min(...highTiers.map((t) => t.min));
      const highMax = Math.max(...highTiers.map((t) => t.max));
      const highMinPct = (highMin / midpoint) * 100;
      const highMaxPct = (highMax / midpoint) * 100;

      samples.push({ optimalMinPct, optimalMaxPct, normalMinPct, normalMaxPct, highMinPct, highMaxPct });
    }

    const clamp = (n: number) => Math.min(bellCurveMax, Math.max(0, n));
    const optMin = median(samples.map((s) => Math.min(s.optimalMinPct, s.optimalMaxPct)));
    const optMax = median(samples.map((s) => Math.max(s.optimalMinPct, s.optimalMaxPct)));
    const normMin = median(samples.map((s) => Math.min(s.normalMinPct, s.normalMaxPct)));
    const normMax = median(samples.map((s) => Math.max(s.normalMinPct, s.normalMaxPct)));
    const highMin = median(samples.map((s) => Math.min(s.highMinPct, s.highMaxPct)));
    const highMax = median(samples.map((s) => Math.max(s.highMinPct, s.highMaxPct)));

    if (optMin === null || optMax === null || normMin === null || normMax === null || highMin === null || highMax === null) {
      return null;
    }

    return {
      optimal: { x1: clamp(optMin), x2: clamp(optMax) },
      normal: { x1: clamp(normMin), x2: clamp(normMax) },
      high: { x1: clamp(highMin), x2: clamp(highMax) },
    };
  })();

  const BellCurveOverlay = (props: any) => {
    const { xAxisMap, viewBox } = props as { xAxisMap: any; viewBox: any };
    if (!viewBox || !xAxisMap || !xAxisMap[0]?.scale) return null;
    const { width, height } = viewBox;
    const xScale = xAxisMap[0].scale as (x: number) => number;

    const mean = 100; // midpoint is the reference center by construction
    const sigma = 18; // controls curve width (visual match, not strict statistics)
    const curveHeight = height * 0.35;
    const baseY = height - 8;

    const steps = 46;
    const xs: number[] = [];
    for (let i = 0; i <= steps; i++) {
      xs.push((bellCurveMax / steps) * i);
    }

    const points = xs.map((x) => {
      const pdf = Math.exp(-0.5 * Math.pow((x - mean) / sigma, 2));
      const y = baseY - pdf * curveHeight;
      const px = xScale(x);
      return [px, y] as const;
    });

    const d = points
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ');

    return (
      <path
        d={d}
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth={2}
        opacity={0.35}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  };

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
              <XAxis type="number" domain={[0, bellCurveMax]} tick={{ fontSize: 10, fill: '#948e84' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#5c5850' }} width={60} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'of midpoint']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e2dc' }}
              />
              {zoneBands ? (
                <>
                  <ReferenceArea
                    x1={zoneBands.optimal.x1}
                    x2={zoneBands.optimal.x2}
                    fill="var(--status-info-bg)"
                    fillOpacity={0.18}
                  />
                  <ReferenceArea
                    x1={zoneBands.normal.x1}
                    x2={zoneBands.normal.x2}
                    fill="var(--status-warning-bg)"
                    fillOpacity={0.12}
                  />
                  <ReferenceArea
                    x1={zoneBands.high.x1}
                    x2={Math.max(zoneBands.high.x2, zoneBands.normal.x2)}
                    fill="var(--status-danger-bg)"
                    fillOpacity={0.12}
                  />
                </>
              ) : null}

              <ReferenceLine x={100} stroke="#e4e2dc" strokeDasharray="3 3" />
              <Customized component={BellCurveOverlay} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={14}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Zones + distribution legend */}
        <div className="px-5 pb-4 text-[10px]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2" style={{ color: '#948e84' }}>
            <div className="flex items-center gap-2">
              <span style={{ width: 10, height: 10, backgroundColor: 'var(--status-info-bg)', borderRadius: 2, border: '1px solid var(--border)' }} />
              Optimal
            </div>
            <div className="flex items-center gap-2">
              <span style={{ width: 10, height: 10, backgroundColor: 'var(--status-warning-bg)', borderRadius: 2, border: '1px solid var(--border)' }} />
              Normal
            </div>
            <div className="flex items-center gap-2">
              <span style={{ width: 10, height: 10, backgroundColor: 'var(--status-danger-bg)', borderRadius: 2, border: '1px solid var(--border)' }} />
              High
            </div>
            <div className="flex items-center gap-2">
              <span style={{ width: 12, height: 0, borderTop: '2px solid var(--text-tertiary)', opacity: 0.35 }} />
              Distribution curve
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
