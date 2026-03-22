'use client';

import clsx from 'clsx';

/**
 * BetterCals logo — donut-chart ring with the green segment forming a "C",
 * plus smaller carbs (amber) and fats (rose) segments.
 */
export default function BetterCalsMark({
  className,
  title = 'BetterCals',
}: {
  className?: string;
  title?: string;
}) {
  const cx = 128;
  const cy = 128;
  const r = 90;
  const stroke = 26;
  const circumference = 2 * Math.PI * r;

  // Green (protein) takes ~70% to form a "C" shape, carbs 18%, fats 12%
  const segments = [
    { pct: 0.70, color: '#6b8f71' },   // protein — sage green → forms the "C"
    { pct: 0.18, color: '#b8960b' },   // carbs — warm amber / gold
    { pct: 0.12, color: '#a05a5a' },   // fats — muted rose
  ];

  // Start at 12 o'clock (top)
  let offset = -circumference * 0.25;

  return (
    <svg
      viewBox="0 0 256 256"
      className={clsx('block', className)}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* Donut segments */}
      {segments.map((seg, i) => {
        const dash = seg.pct * circumference;
        const gap = circumference - dash;
        const currentOffset = offset;
        offset += dash;

        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
