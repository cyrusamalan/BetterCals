'use client';

import { useEffect, useState } from 'react';
import type { BloodMarkers } from '@/types';
import { getMarkerUnit } from '@/lib/bloodParser';
import { MARKER_FIELDS_BY_KEY } from '@/lib/markerMetadata';

const POPUP_WIDTH = 340;
const POPUP_EST_HEIGHT = 320;
const GAP = 12;

type Placement = 'right' | 'left' | 'below' | 'above';

function computePopupPosition(rect: DOMRect, vw: number, vh: number) {
  const margin = 12;

  const spaceRight = vw - rect.right;
  const spaceLeft = rect.left;
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;

  let placement: Placement;
  if (spaceRight >= POPUP_WIDTH + GAP + margin) placement = 'right';
  else if (spaceLeft >= POPUP_WIDTH + GAP + margin) placement = 'left';
  else if (spaceBelow >= POPUP_EST_HEIGHT + GAP + margin) placement = 'below';
  else if (spaceAbove >= POPUP_EST_HEIGHT + GAP + margin) placement = 'above';
  else placement = spaceBelow > spaceAbove ? 'below' : 'above';

  let left: number;
  let top: number;
  if (placement === 'right') {
    left = rect.right + GAP;
    top = rect.top + rect.height / 2 - POPUP_EST_HEIGHT / 2;
  } else if (placement === 'left') {
    left = rect.left - GAP - POPUP_WIDTH;
    top = rect.top + rect.height / 2 - POPUP_EST_HEIGHT / 2;
  } else if (placement === 'below') {
    left = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
    top = rect.bottom + GAP;
  } else {
    left = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
    top = rect.top - GAP - POPUP_EST_HEIGHT;
  }

  left = Math.max(margin, Math.min(left, vw - POPUP_WIDTH - margin));
  top = Math.max(margin, Math.min(top, vh - POPUP_EST_HEIGHT - margin));

  const transformOrigin =
    placement === 'right'
      ? 'left center'
      : placement === 'left'
        ? 'right center'
        : placement === 'below'
          ? 'top center'
          : 'bottom center';

  return { left, top, width: POPUP_WIDTH, placement, transformOrigin };
}

export default function MarkerHoverPopup({
  markerKey,
  value,
  rect,
  onDismiss,
}: {
  markerKey: keyof BloodMarkers | null;
  value: number | null;
  rect: DOMRect | null;
  onDismiss: () => void;
}) {
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isOpen = markerKey !== null && value !== null && rect !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onScroll = () => onDismiss();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [isOpen, onDismiss]);

  if (!markerKey || value === null || !rect) return null;

  const meta = MARKER_FIELDS_BY_KEY[markerKey];
  const title = meta?.label ?? markerKey;
  const unit = getMarkerUnit(markerKey) ?? meta?.unit ?? '';

  const pad = 6;
  const cutTop = Math.max(0, rect.top - pad);
  const cutLeft = Math.max(0, rect.left - pad);
  const cutRight = Math.min(viewport.w, rect.right + pad);
  const cutBottom = Math.min(viewport.h, rect.bottom + pad);
  const cutHeight = cutBottom - cutTop;

  const pos = computePopupPosition(rect, viewport.w, viewport.h);

  const blurStyle: React.CSSProperties = {
    backdropFilter: 'blur(10px) saturate(1.05)',
    WebkitBackdropFilter: 'blur(10px) saturate(1.05)',
    background: 'rgba(12, 18, 24, 0.14)',
    animation: 'fadeIn 0.22s ease both',
  };

  return (
    <>
      {/* Four blur strips surrounding the card — leaves card visually untouched */}
      <div
        className="fixed pointer-events-none z-[55]"
        style={{ top: 0, left: 0, right: 0, height: cutTop, ...blurStyle }}
      />
      <div
        className="fixed pointer-events-none z-[55]"
        style={{ top: cutBottom, left: 0, right: 0, bottom: 0, ...blurStyle }}
      />
      <div
        className="fixed pointer-events-none z-[55]"
        style={{ top: cutTop, height: cutHeight, left: 0, width: cutLeft, ...blurStyle }}
      />
      <div
        className="fixed pointer-events-none z-[55]"
        style={{
          top: cutTop,
          height: cutHeight,
          left: cutRight,
          right: 0,
          ...blurStyle,
        }}
      />

      {/* Subtle ring highlighting the card through the cutout */}
      <div
        aria-hidden
        className="fixed pointer-events-none z-[56]"
        style={{
          top: cutTop,
          left: cutLeft,
          width: cutRight - cutLeft,
          height: cutHeight,
          borderRadius: 14,
          boxShadow:
            '0 0 0 2px rgba(107, 143, 113, 0.55), 0 20px 48px rgba(8, 12, 22, 0.18)',
          animation: 'fadeIn 0.22s ease both',
        }}
      />

      {/* Popup */}
      <div
        role="tooltip"
        className="fixed pointer-events-none z-[60]"
        style={{
          left: pos.left,
          top: pos.top,
          width: pos.width,
          animation: 'markerPopupIn 0.3s cubic-bezier(0.22, 1.2, 0.36, 1) both',
          transformOrigin: pos.transformOrigin,
        }}
      >
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            backdropFilter: 'blur(32px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
            boxShadow:
              '0 28px 68px rgba(0,0,0,0.22), 0 8px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.55)',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3
                className="text-base font-semibold leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Current value: <span className="font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{value} {unit}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs leading-relaxed">
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

      <style>{`
        @keyframes markerPopupIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
