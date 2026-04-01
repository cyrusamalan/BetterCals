'use client';

import { PopulationBenchmark } from '@/types';
import { Users } from 'lucide-react';

const LABELS: Partial<Record<PopulationBenchmark['marker'], string>> = {
  hba1c: 'HbA1c',
  ldl: 'LDL',
  hdl: 'HDL',
  triglycerides: 'Triglycerides',
  glucose: 'Glucose',
  vitaminD: 'Vitamin D',
  ferritin: 'Ferritin',
  hsCRP: 'hs-CRP',
  fastingInsulin: 'Fasting Insulin',
};

function deltaColor(delta: number) {
  if (Math.abs(delta) < 0.1) return 'var(--text-tertiary)';
  return delta > 0 ? 'var(--status-warning)' : 'var(--status-normal)';
}

export default function PopulationBenchmarksCard({ benchmarks }: { benchmarks: PopulationBenchmark[] }) {
  const visible = benchmarks.filter((item) => LABELS[item.marker]).slice(0, 6);
  if (visible.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl noise"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Population Benchmarks
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Compared with public age and sex medians already built into the app.
          </p>
        </div>
      </div>

      <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((item) => (
          <div
            key={item.marker}
            className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {LABELS[item.marker]}
              </span>
              <span className="text-xs font-semibold" style={{ color: deltaColor(item.delta) }}>
                {item.delta > 0 ? '+' : ''}
                {item.delta}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              You: {item.userValue} · Public median: {item.benchmarkValue}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
