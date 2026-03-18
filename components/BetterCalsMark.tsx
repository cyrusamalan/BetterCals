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
      width="64"
      height="64"
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

      {/* Leaves */}
      <path
        d="M11 40c0-10 10-18 21-18-2 12-8 22-21 22-1.5 0-2-.7-2-4z"
        fill="url(#bc-leaf)"
      />
      <path
        d="M53 40c0-10-10-18-21-18 2 12 8 22 21 22 1.5 0 2-.7 2-4z"
        fill="url(#bc-leaf)"
        opacity="0.98"
      />

      {/* Flame */}
      <path
        d="M32 10c6.5 8 8.5 13.5 8.5 18.5C40.5 36 36.8 42 32 42s-8.5-6-8.5-13.5C23.5 23.5 25.5 18 32 10z"
        fill="url(#bc-flame)"
      />
      <path
        d="M32 18c3.7 4.7 4.8 8 4.8 10.9 0 4.2-2.2 7.6-4.8 7.6s-4.8-3.4-4.8-7.6c0-2.9 1.1-6.2 4.8-10.9z"
        fill="#FFD6A3"
        opacity="0.7"
      />
    </svg>
  );
}

