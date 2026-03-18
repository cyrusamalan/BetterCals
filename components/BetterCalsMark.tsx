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
      viewBox="0 0 100 100"
      className={clsx('block', className)}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Leaf (right) */}
      <path
        d="M66 24
           C79 35 85 51 81 67
           C77 83 60 90 47 84
           C49 70 55 44 66 24 Z"
        fill="#6F8B73"
      />
      {/* Leaf inner shade */}
      <path
        d="M70 31
           C78 42 81 54 79 66
           C77 77 67 83 58 82
           C61 69 65 48 70 31 Z"
        fill="#5E7865"
        opacity="0.7"
      />

      {/* Flame (left outer) */}
      <path
        d="M41 12
           C55 26 62 39 62 54
           C62 77 46 88 31 88
           C20 88 14 81 14 70
           C14 52 30 38 39 26
           C45 18 44 15 41 12 Z"
        fill="#F28C2B"
      />
      {/* Flame darker inner */}
      <path
        d="M47 21
           C55 33 56 44 50 53
           C42 64 40 73 44 82
           C30 77 27 65 29 57
           C32 46 42 39 46 31
           C48 27 48 24 47 21 Z"
        fill="#E56B22"
        opacity="0.95"
      />
      {/* Red stripe */}
      <path
        d="M53 26
           C58 36 57 44 53 50
           C47 58 45 65 47 74
           C41 67 40 59 42 53
           C44 45 50 40 52 34
           C54 30 54 28 53 26 Z"
        fill="#D94A2A"
        opacity="0.9"
      />
    </svg>
  );
}

