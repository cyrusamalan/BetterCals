import type { MarkerStatus, UserProfile } from '@/types';

/**
 * Vitals-tier helpers for values that live on `UserProfile` (not `BloodMarkers`)
 * and don't flow through the blood-marker category-scoring pipeline.
 */

export interface RHRTier {
  label: string;
  status: MarkerStatus;
  /** CSS variable name for text/accent color. Matches tokens used by dashboard cards. */
  colorVar: string;
  /** CSS variable name for the tier chip background. */
  bgVar: string;
  note: string;
}

/**
 * Classify a resting heart rate into a qualitative tier.
 *
 * Tiers are age- and activity-aware: users self-reporting `active` or
 * `very-active` lifestyles get a lower "athletic" band so that 40-59 bpm isn't
 * flagged as bradycardia. For everyone else, bpm < 50 is treated as low.
 *
 * Returns `null` when the input is missing or clearly implausible.
 */
export function classifyRHR(
  rhrBpm: number | undefined,
  profile: Pick<UserProfile, 'activityLevel'>,
): RHRTier | null {
  if (rhrBpm === undefined || rhrBpm === null) return null;
  if (!Number.isFinite(rhrBpm)) return null;
  if (rhrBpm < 20 || rhrBpm > 250) return null;

  const athletic = profile.activityLevel === 'active' || profile.activityLevel === 'very-active';

  if (rhrBpm < 40) {
    return {
      label: 'Bradycardia',
      status: 'critical',
      colorVar: 'var(--status-danger)',
      bgVar: 'var(--status-danger-bg)',
      note: 'A resting heart rate under 40 bpm is unusually low. Discuss with a clinician to rule out conduction issues.',
    };
  }

  if (rhrBpm < 50) {
    if (athletic) {
      return {
        label: 'Excellent (athletic)',
        status: 'optimal',
        colorVar: 'var(--status-normal)',
        bgVar: 'var(--status-normal-bg)',
        note: 'Low resting HR is typical in well-trained athletes and associated with strong cardiovascular fitness.',
      };
    }
    return {
      label: 'Low',
      status: 'low',
      colorVar: 'var(--status-warning)',
      bgVar: 'var(--status-warning-bg)',
      note: 'A resting HR below 50 is unusual outside of endurance athletes or medications such as beta-blockers. Worth confirming with a clinician if you also feel dizzy or fatigued.',
    };
  }

  if (rhrBpm < 60) {
    return {
      label: 'Excellent',
      status: 'optimal',
      colorVar: 'var(--status-normal)',
      bgVar: 'var(--status-normal-bg)',
      note: 'A resting HR in the 50s is associated with strong cardiovascular fitness and lower long-term CV risk.',
    };
  }

  if (rhrBpm <= 70) {
    return {
      label: 'Good',
      status: 'normal',
      colorVar: 'var(--status-normal)',
      bgVar: 'var(--status-normal-bg)',
      note: 'A resting HR of 60-70 is within the typical healthy adult range.',
    };
  }

  if (rhrBpm <= 85) {
    return {
      label: 'Elevated',
      status: 'borderline',
      colorVar: 'var(--status-warning)',
      bgVar: 'var(--status-warning-bg)',
      note: 'Each ~10 bpm above 60 is associated with measurably higher long-term cardiovascular risk. Aerobic fitness, sleep, stress, caffeine, and hydration all move this number.',
    };
  }

  if (rhrBpm < 100) {
    return {
      label: 'High',
      status: 'high',
      colorVar: 'var(--status-danger)',
      bgVar: 'var(--status-danger-bg)',
      note: 'A resting HR in the high 80s-90s is above the typical range for healthy adults. Consider discussing with a clinician, especially alongside elevated BP or stress.',
    };
  }

  return {
    label: 'Tachycardia',
    status: 'critical',
    colorVar: 'var(--status-danger)',
    bgVar: 'var(--status-danger-bg)',
    note: 'A sustained resting HR at or above 100 bpm is clinically significant. Recommend following up with a clinician.',
  };
}
