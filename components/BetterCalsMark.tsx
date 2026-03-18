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
      viewBox="0 0 96 96"
      className={clsx('block', className)}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="bcFlameOuter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59A3E" />
          <stop offset="55%" stopColor="#F07E2D" />
          <stop offset="100%" stopColor="#D96A1C" />
        </linearGradient>
        <linearGradient id="bcFlameInner" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#F25B2B" />
          <stop offset="100%" stopColor="#D9411F" />
        </linearGradient>
        <linearGradient id="bcLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7F9B83" />
          <stop offset="100%" stopColor="#6B866F" />
        </linearGradient>
        <linearGradient id="bcLeafShade" x1="0.2" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6D886F" stopOpacity="0" />
          <stop offset="100%" stopColor="#5D7562" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* No background: let header surface show through */}

      {/* Leaf (right) */}
      <path
        d="M66 26
           C78 36 82 54 76 68
           C71 80 58 86 46 82
           C48 68 54 44 66 26 Z"
        fill="url(#bcLeaf)"
      />
      <path
        d="M66 26
           C78 36 82 54 76 68
           C71 80 58 86 46 82
           C48 68 54 44 66 26 Z"
        fill="url(#bcLeafShade)"
      />

      {/* Flame (left) */}
      <path
        d="M40 14
           C54 28 60 40 60 54
           C60 74 46 84 32 84
           C22 84 16 78 16 68
           C16 52 30 38 38 28
           C44 20 42 17 40 14 Z"
        fill="url(#bcFlameOuter)"
      />

      {/* Inner flame sweep (red) */}
      <path
        d="M48 22
           C54 34 52 44 46 52
           C38 62 36 70 40 78
           C28 74 24 64 26 56
           C29 45 40 38 44 30
           C46 26 47 24 48 22 Z"
        fill="url(#bcFlameInner)"
        opacity="0.92"
      />

      {/* Soft highlight on flame */}
      <path
        d="M36 30
           C38 24 42 20 44 18
           C50 28 48 36 42 44
           C36 52 32 60 34 68
           C26 62 28 44 36 30 Z"
        fill="#FFD6A3"
        opacity="0.25"
      />
    </svg>
  );
}

