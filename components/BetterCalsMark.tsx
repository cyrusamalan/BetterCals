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
      viewBox="0 0 64 64"
      className={clsx('block', className)}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="bc-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F6A44B" />
          <stop offset="55%" stopColor="#F1842B" />
          <stop offset="100%" stopColor="#D86A1B" />
        </linearGradient>
        <linearGradient id="bc-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7A9A73" />
          <stop offset="100%" stopColor="#5F7F59" />
        </linearGradient>
      </defs>

      {/* Subtle background circle */}
      <circle cx="32" cy="34" r="22" fill="#F9F7F2" />

      {/* Leaves */}
      <path
        d="M10 40c0-11 10-20 22-20-2.4 13-8.8 24-22 24-1.5 0-2-.7-2-4z"
        fill="url(#bc-leaf)"
      />
      <path
        d="M54 40c0-11-10-20-22-20 2.4 13 8.8 24 22 24 1.5 0 2-.7 2-4z"
        fill="url(#bc-leaf)"
        opacity="0.96"
      />

      {/* Flame */}
      <path
        d="M32 9c6.8 8.6 9.2 14.3 9.2 19.8C41.2 36.6 37.7 43 32 43s-9.2-6.4-9.2-14.2C22.8 23.3 25.2 17.6 32 9z"
        fill="url(#bc-flame)"
      />
      <path
        d="M32 18c3.9 5 5.2 8.7 5.2 11.8 0 4.4-2.4 7.8-5.2 7.8s-5.2-3.4-5.2-7.8c0-3.1 1.3-6.8 5.2-11.8z"
        fill="#FFD6A3"
        opacity="0.8"
      />

      {/* Flame outline for crispness */}
      <path
        d="M32 9c6.8 8.6 9.2 14.3 9.2 19.8C41.2 36.6 37.7 43 32 43s-9.2-6.4-9.2-14.2C22.8 23.3 25.2 17.6 32 9z"
        fill="none"
        stroke="#E06D2B"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

