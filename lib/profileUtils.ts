import type { FocusGoal, UserProfile } from '@/types';

/**
 * Migrates legacy profiles where `focusGoal` was stored as a single string.
 * Call when loading profile from localStorage, API, or analysis history JSON.
 */
export function normalizeUserProfile(profile: UserProfile): UserProfile {
  const raw = profile.focusGoal as unknown;
  if (raw === undefined) return profile;
  if (typeof raw === 'string') {
    return { ...profile, focusGoal: [raw as FocusGoal] };
  }
  if (Array.isArray(raw)) {
    return { ...profile, focusGoal: raw as FocusGoal[] };
  }
  return profile;
}
