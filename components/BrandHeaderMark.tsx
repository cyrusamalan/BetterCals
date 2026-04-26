'use client';

import Link from 'next/link';
import VitalsMark from '@/components/VitalsMark';

interface BrandHeaderMarkProps {
  href?: string;
  sizePx?: number;
  className?: string;
}

export default function BrandHeaderMark({
  href = '/',
  sizePx = 34,
  className = '',
}: BrandHeaderMarkProps) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 ${className}`.trim()}>
      <div className="flex items-center justify-center shrink-0" style={{ width: `${Math.round(sizePx * 1.15)}px`, height: `${Math.round(sizePx * 1.15)}px` }}>
        <VitalsMark sizePx={sizePx} />
      </div>
      <div className="leading-tight min-w-0">
        <div className="text-[18px] sm:text-[20px] font-bold font-display" style={{ color: 'var(--text-primary)' }}>
          BetterCals
        </div>
        <div className="hidden sm:block text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
          Smart calories + blood marker insights
        </div>
      </div>
    </Link>
  );
}
