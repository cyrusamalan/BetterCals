import type { AnalysisResult, BloodMarkers, CoachPlan, UserProfile } from '@/types';

function extractNumericTokens(text: string): string[] {
  const matches = text.match(/(?<![\w.])\d[\d,]*(?:\.\d+)?%?\+?(?![\w.])/g);
  if (!matches) return [];

  return matches
    .map((token) => {
      const cleaned = token
        .replace(/,/g, '')
        .replace(/\+$/, '')
        .replace(/%$/, '');
      const value = Number(cleaned);
      if (!Number.isFinite(value)) return null;
      return Number.isInteger(value) ? String(Math.trunc(value)) : String(Number(value.toFixed(2)));
    })
    .filter((token): token is string => token !== null);
}

function buildAllowedNumbers(input: {
  profile: UserProfile;
  markers: BloodMarkers;
  result: AnalysisResult;
  plan: CoachPlan;
}): Set<string> {
  const blob = JSON.stringify(input);
  const baseTokens = new Set(extractNumericTokens(blob));

  // Allow simple arithmetic deltas between grounded anchors (for example:
  // maintain calories vs deficit tier difference).
  const numericValues = Array.from(baseTokens)
    .map((token) => Number(token))
    .filter((n) => Number.isFinite(n));

  for (let i = 0; i < numericValues.length; i += 1) {
    for (let j = i + 1; j < numericValues.length; j += 1) {
      const delta = Math.abs(numericValues[i] - numericValues[j]);
      if (delta <= 0) continue;
      // Keep this conservative to reduce risk of unrelated large hallucinated numbers.
      if (delta <= 2000) {
        baseTokens.add(String(Number.isInteger(delta) ? Math.trunc(delta) : Number(delta.toFixed(2))));
      }
    }
  }

  return baseTokens;
}

export function isCoachReplyGrounded(
  reply: string,
  input: {
    profile: UserProfile;
    markers: BloodMarkers;
    result: AnalysisResult;
    plan: CoachPlan;
  },
): boolean {
  const allowed = buildAllowedNumbers(input);
  const replyNumbers = extractNumericTokens(reply);
  if (replyNumbers.length === 0) return true;

  // Permit a few coordination numbers that are often benign in coaching text.
  const benign = new Set(['1', '2', '3', '7', '14', '30', '100']);
  for (const token of replyNumbers) {
    if (allowed.has(token)) continue;
    if (benign.has(token)) continue;
    return false;
  }
  return true;
}
