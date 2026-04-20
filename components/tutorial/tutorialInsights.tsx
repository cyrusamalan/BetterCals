'use client';

import { motion } from 'framer-motion';
import { Droplets, Shield, Sun, Zap } from 'lucide-react';
import { easeOut } from './constants';

export const insightStyles = {
  strong: {
    border: 'rgba(125, 200, 138, 0.45)',
    iconBg: 'linear-gradient(145deg, rgba(125,200,138,0.28) 0%, rgba(90,140,100,0.12) 100%)',
    iconBorder: 'rgba(125, 200, 138, 0.35)',
    badge: 'rgba(125, 200, 138, 0.22)',
    badgeText: '#b6f0c4',
    badgeLabel: 'On track',
  },
  steady: {
    border: 'rgba(96, 165, 250, 0.4)',
    iconBg: 'linear-gradient(145deg, rgba(96,165,250,0.22) 0%, rgba(59,130,246,0.08) 100%)',
    iconBorder: 'rgba(96, 165, 250, 0.35)',
    badge: 'rgba(96, 165, 250, 0.2)',
    badgeText: '#bfdbfe',
    badgeLabel: 'Steady',
  },
  refine: {
    border: 'rgba(251, 191, 36, 0.45)',
    iconBg: 'linear-gradient(145deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.08) 100%)',
    iconBorder: 'rgba(251, 191, 36, 0.35)',
    badge: 'rgba(251, 191, 36, 0.18)',
    badgeText: '#fde68a',
    badgeLabel: 'Refine',
  },
  calm: {
    border: 'rgba(167, 139, 250, 0.35)',
    iconBg: 'linear-gradient(145deg, rgba(167,139,250,0.2) 0%, rgba(139,92,246,0.08) 100%)',
    iconBorder: 'rgba(167, 139, 250, 0.32)',
    badge: 'rgba(167, 139, 250, 0.18)',
    badgeText: '#ddd6fe',
    badgeLabel: 'Calm',
  },
} as const;

type InsightTone = keyof typeof insightStyles;

export const mockInsights: {
  icon: typeof Droplets;
  tone: InsightTone;
  category: string;
  headline: string;
  metric: string;
  detail: string;
}[] = [
  {
    icon: Droplets,
    tone: 'strong',
    category: 'Lipids & heart',
    headline: 'ApoB in a controlled range',
    metric: '85 mg/dL · LDL/HDL 2.1',
    detail: 'Particle-driven risk looks aligned with your goals — keep fiber and movement consistent.',
  },
  {
    icon: Zap,
    tone: 'steady',
    category: 'Metabolic',
    headline: 'Glucose & insulin balance',
    metric: 'Fasting 88 mg/dL · HOMA-IR 0.9',
    detail: 'Signals point to steady energy — pair carbs with protein when you eat.',
  },
  {
    icon: Sun,
    tone: 'refine',
    category: 'Nutrients',
    headline: 'Vitamin D — room to lift',
    metric: '28 ng/mL (insufficient band)',
    detail: 'A focused plan with your clinician can close the gap without guesswork.',
  },
  {
    icon: Shield,
    tone: 'calm',
    category: 'Inflammation',
    headline: 'Quiet inflammatory background',
    metric: 'hs-CRP 0.6 mg/L',
    detail: 'No red flag here — great baseline to track over your next labs.',
  },
];

export function InsightCard({
  item,
  compact,
}: {
  item: (typeof mockInsights)[number];
  compact?: boolean;
}) {
  const Icon = item.icon;
  const st = insightStyles[item.tone];
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, x: -10 },
        show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: easeOut } },
      }}
      className="rounded-xl pl-[3px] overflow-hidden h-full"
      style={{
        background: 'rgba(0,0,0,0.22)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className={`flex gap-2.5 rounded-[11px] h-full ${compact ? 'p-2 sm:p-2.5' : 'gap-3 p-2.5 sm:p-3'}`}
        style={{ borderLeft: `3px solid ${st.border}` }}
      >
        <div
          className={`rounded-lg flex items-center justify-center flex-shrink-0 ${compact ? 'w-8 h-8' : 'w-9 h-9'}`}
          style={{
            background: st.iconBg,
            border: `1px solid ${st.iconBorder}`,
          }}
        >
          <Icon className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} style={{ color: '#e2e8f0' }} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 gap-y-0.5 mb-0.5">
            <span
              className={`font-semibold uppercase tracking-wider ${compact ? 'text-[9px]' : 'text-[10px]'}`}
              style={{ color: 'rgba(148,163,184,0.95)' }}
            >
              {item.category}
            </span>
            <span
              className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide px-1 py-0 rounded"
              style={{ background: st.badge, color: st.badgeText }}
            >
              {st.badgeLabel}
            </span>
          </div>
          <p className={`font-semibold leading-snug ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: '#f8fafc' }}>
            {item.headline}
          </p>
          <p
            className={`font-medium tabular-nums mt-0.5 ${compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'}`}
            style={{ color: 'rgba(186, 230, 253, 0.92)' }}
          >
            {item.metric}
          </p>
          <p
            className={`leading-relaxed mt-1 ${compact ? 'text-[10px] line-clamp-3' : 'text-[11px] sm:text-xs'}`}
            style={{ color: 'rgba(148,163,184,0.95)' }}
          >
            {item.detail}
          </p>
        </div>
      </div>
    </motion.li>
  );
}
