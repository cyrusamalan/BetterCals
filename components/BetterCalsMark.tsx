'use client';

import clsx from 'clsx';

export default function BetterCalsMark({
  className,
  title = 'BetterCals',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={clsx('block', className)}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      <defs>
        <linearGradient id="bcHeart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F36A5B" />
          <stop offset="60%" stopColor="#E24B4B" />
          <stop offset="100%" stopColor="#C93A45" />
        </linearGradient>
        <linearGradient id="bcHeartHighlight" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#FFD3C7" stopOpacity="0.75" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Heart mark */}
      <path
        d="
          M 128 220
          C 96 194 56 160 56 116
          C 56 88 74 68 100 68
          C 114 68 124 74 128 82
          C 132 74 142 68 156 68
          C 182 68 200 88 200 116
          C 200 160 160 194 128 220
          Z
        "
        fill="url(#bcHeart)"
      />

      {/* Inner highlight */}
      <path
        d="
          M 98 84
          C 86 90 78 102 78 116
          C 78 140 100 162 128 186
          C 112 168 100 148 100 126
          C 100 110 108 98 118 90
          C 110 84 104 82 98 84
          Z
        "
        fill="url(#bcHeartHighlight)"
      />
    </svg>
  );
}

