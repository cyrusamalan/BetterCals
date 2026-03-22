'use client';

import React from 'react';

export default function VitalsMark({ sizePx = 34 }: { sizePx?: number }) {
  const baseSize = 280;
  const scale = sizePx / baseSize;

  // Keep the donut hole usable at small sizes.
  const thicknessPx = Math.max(6, Math.round(42 * scale));

  const gradient = `conic-gradient(from 90deg,
    #a05a5a 0deg 45deg,
    #22c55e 45deg 315deg,
    #b8960b 315deg 360deg
  )`;

  const ringMask = `radial-gradient(farthest-side, transparent calc(100% - ${thicknessPx}px), #000 calc(100% - ${thicknessPx - 1}px))`;

  // Don't clamp too high; otherwise the ECG trace becomes too thick and loses clarity.
  const strokeWidth = Math.max(0.9, 4.2 * scale);

  return (
    <div
      style={{
        width: sizePx,
        height: sizePx,
        position: 'relative',
        borderRadius: 9999,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 9999,
          background: gradient,
          WebkitMaskImage: ringMask,
          maskImage: ringMask,
        }}
      />

      <svg
        viewBox="0 0 140 80"
        style={{
          position: 'absolute',
          inset: 0,
          width: '74%',
          height: '56%',
          margin: 'auto',
          overflow: 'visible',
        }}
      >
        <path
          d="M8 44
             L30 44
             L36 44
             L42 38
             L48 44
             L54 44
             L60 44
             L62 36
             L66 44
             L70 44
             L74 18
             L78 44
             L86 68
             L90 44
             L106 44
             L110 36
             L116 44
             L122 44
             L130 44"
          fill="none"
          stroke="#ff0000"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(255,0,0,0.6))' }}
        />
      </svg>
    </div>
  );
}

