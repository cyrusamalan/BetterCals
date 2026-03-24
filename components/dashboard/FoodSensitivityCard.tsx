'use client';

import type { FoodSensitivityFlag } from '@/types';
import { AlertTriangle, Info } from 'lucide-react';

interface FoodSensitivityCardProps {
  flags: FoodSensitivityFlag[];
}

export default function FoodSensitivityCard({ flags }: FoodSensitivityCardProps) {
  if (flags.length === 0) return null;

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
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color: 'var(--status-warning)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dietary Flags
          </h3>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Pattern-based flags from your marker combinations — not diagnoses.
        </p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {flags.map((flag, i) => {
          const isWarning = flag.severity === 'warning';
          const iconColor = isWarning ? 'var(--status-warning)' : 'var(--status-info)';
          const bgColor = isWarning ? 'rgba(212, 165, 116, 0.08)' : 'rgba(107, 143, 113, 0.08)';
          const borderColor = isWarning ? 'rgba(212, 165, 116, 0.2)' : 'rgba(107, 143, 113, 0.2)';

          return (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4" style={{ color: iconColor }} />
                  ) : (
                    <Info className="w-4 h-4" style={{ color: iconColor }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {flag.title}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${iconColor}18`, color: iconColor }}
                    >
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Based on: {flag.markers}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {flag.suggestion}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
