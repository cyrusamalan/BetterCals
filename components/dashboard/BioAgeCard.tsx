'use client';

import { useMemo } from 'react';
import { Hourglass, TrendingDown, TrendingUp, Minus, Info } from 'lucide-react';
import type { BloodMarkers, UserProfile } from '@/types';
import { calculatePhenoAge, PHENOAGE_REQUIRED_MARKERS } from '@/lib/phenoAge';
import { MARKER_NAMES } from '@/lib/calculations';

interface BioAgeCardProps {
  profile: UserProfile;
  markers: BloodMarkers;
}

export default function BioAgeCard({ profile, markers }: BioAgeCardProps) {
  const result = useMemo(() => calculatePhenoAge(profile, markers), [profile, markers]);

  // ── Locked state: surface which markers are needed so the user knows what to add. ──
  if (!result) {
    const missing = PHENOAGE_REQUIRED_MARKERS.filter(
      (key) => typeof markers[key] !== 'number',
    );

    return (
      <div
        className="rounded-2xl p-5 border"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Hourglass className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Biological Age
          </h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Add a CBC + inflammation panel to unlock your PhenoAge estimate.
        </p>
        {missing.length > 0 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Missing: {missing.map((k) => MARKER_NAMES[k]).join(', ')}
          </p>
        )}
      </div>
    );
  }

  const { phenoAge, chronologicalAge, delta, usedEstimates, missingMarkers } = result;
  const direction: 'younger' | 'older' | 'on-track' =
    delta < -0.5 ? 'younger' : delta > 0.5 ? 'older' : 'on-track';

  const palette = {
    younger: { accent: 'var(--status-success-bg)', text: 'var(--status-success)', icon: TrendingDown },
    older: { accent: 'var(--status-danger-bg)', text: 'var(--status-danger)', icon: TrendingUp },
    'on-track': { accent: 'var(--accent-subtle)', text: 'var(--accent)', icon: Minus },
  }[direction];
  const Icon = palette.icon;

  const deltaLabel =
    direction === 'on-track'
      ? 'On track with your calendar age'
      : `${Math.abs(delta).toFixed(1)} years ${direction === 'younger' ? 'younger' : 'older'} than your calendar age`;

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Hourglass className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Biological Age
          </h3>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--border-light)', color: 'var(--text-tertiary)' }}
          title="Levine PhenoAge (2018) — 9-marker phenotypic age model"
        >
          PhenoAge
        </span>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Bio age
          </p>
          <p className="font-display text-4xl tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>
            {phenoAge.toFixed(1)}
          </p>
        </div>
        <div className="pb-1">
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Calendar age
          </p>
          <p className="text-lg font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {chronologicalAge}
          </p>
        </div>
      </div>

      <div
        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{ background: palette.accent, color: palette.text }}
      >
        <Icon className="w-3.5 h-3.5" />
        {direction === 'on-track'
          ? deltaLabel
          : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} yrs · ${deltaLabel}`}
      </div>

      {usedEstimates && (
        <div
          className="mt-3 flex items-start gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md"
          style={{ background: 'var(--status-info-bg)', color: 'var(--text-secondary)' }}
        >
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Estimated using population averages for: {missingMarkers.map((k) => MARKER_NAMES[k]).join(', ')}.
            Add these to refine the score.
          </span>
        </div>
      )}

      <p className="mt-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        PhenoAge is directional — track the delta over time, not single-point absolutes.
      </p>
    </div>
  );
}
