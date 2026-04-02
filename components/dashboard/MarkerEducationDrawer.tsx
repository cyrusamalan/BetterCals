'use client';

import type { BloodMarkers } from '@/types';
import { getMarkerUnit } from '@/lib/bloodParser';
import { MARKER_FIELDS_BY_KEY } from '@/lib/markerMetadata';

export default function MarkerEducationDrawer({
  markerKey,
  value,
  open,
  onClose,
}: {
  markerKey: keyof BloodMarkers | null;
  value: number | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !markerKey || value === null) return null;

  const meta = MARKER_FIELDS_BY_KEY[markerKey];
  const title = meta?.label ?? markerKey;
  const unit = getMarkerUnit(markerKey) ?? meta?.unit ?? '';

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-label="Close marker details"
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl p-5 md:max-w-xl md:mx-auto anim-fade-up"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} details`}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: 'var(--border)' }} />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Current value: {value} {unit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-2.5 py-1 rounded-md flex-shrink-0"
            style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {meta?.optimalRange ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Target range:</span>{' '}
              {meta.optimalRange}
            </p>
          ) : null}

          <p style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>What this marker measures:</span>{' '}
            {meta?.description ?? 'This marker helps evaluate your metabolic and cardiometabolic health profile.'}
          </p>

          <p style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>What affects it:</span>{' '}
            {meta?.affects ?? 'Nutrition quality, exercise, sleep quality, stress load, and medications.'}
          </p>

          <p style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Foods that help improve it:</span>{' '}
            {meta?.foods ?? 'Whole-food meals with more fiber, lean proteins, and anti-inflammatory fats.'}
          </p>

          <p style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>When to retest:</span>{' '}
            {meta?.retest ?? 'Usually 8-12 weeks after consistent lifestyle changes.'}
          </p>
        </div>
      </div>
    </div>
  );
}

