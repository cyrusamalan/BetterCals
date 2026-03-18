'use client';

import { CalorieTier } from '@/types';
import { Flame } from 'lucide-react';

interface CalorieTiersCardProps {
  tiers: CalorieTier[];
  userGoal: 'lose' | 'maintain' | 'gain';
  targetCalories: number;
}

export default function CalorieTiersCard({ tiers, userGoal, targetCalories }: CalorieTiersCardProps) {
  function isHighlighted(tier: CalorieTier): boolean {
    return tier.dailyCalories === targetCalories;
  }

  function tierMatchesGoal(tier: CalorieTier): boolean {
    if (userGoal === 'lose') return tier.dailyDeficit < 0;
    if (userGoal === 'gain') return tier.dailyDeficit > 0;
    return tier.dailyDeficit === 0;
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl noise"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f9f5ec' }}>
          <Flame className="w-4 h-4" style={{ color: 'var(--accent-warm)' }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Calorie Goal Tiers</h3>
      </div>

      <div className="px-5 py-4 space-y-2">
        {tiers.map((tier) => {
          const highlighted = isHighlighted(tier);
          const inGoalRange = tierMatchesGoal(tier);
          return (
            <div
              key={tier.label}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: highlighted ? 'var(--status-normal-bg)' : inGoalRange ? 'var(--bg-warm)' : 'transparent',
                border: highlighted ? '1.5px solid var(--status-normal-border)' : '1.5px solid transparent',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-medium"
                  style={{ color: highlighted ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  {tier.label}
                </span>
                {highlighted && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                  >
                    Your Target
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-[11px] tabular-nums"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {tier.dailyDeficit > 0 ? '+' : ''}{tier.dailyDeficit} cal/day
                </span>
                <span
                  className="font-display text-lg tabular-nums"
                  style={{ color: highlighted ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  {tier.dailyCalories.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
