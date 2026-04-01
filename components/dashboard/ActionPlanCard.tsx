'use client';

import { ActionPlanItem } from '@/types';
import { CheckCircle2 } from 'lucide-react';

export default function ActionPlanCard({ items }: { items: ActionPlanItem[] }) {
  if (items.length === 0) return null;

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
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Top 3 This Month
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Prioritized from your current marker profile and recommendations.
        </p>
      </div>
      <div className="px-5 py-5 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
              >
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
                    Priority {item.priority}
                  </span>
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h4>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {item.rationale}
                </p>
                {item.relatedMarkers.length > 0 && (
                  <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    Markers: {item.relatedMarkers.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
