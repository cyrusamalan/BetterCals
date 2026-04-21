import type { AnalysisResult, BloodMarkers, CoachPlan, UserProfile } from '@/types';

function extractNumericTokens(text: string): string[] {
  const matches = text.match(/\b\d+(?:\.\d+)?%?\b/g);
  return matches ?? [];
}

function buildAllowedNumbers(input: {
  profile: UserProfile;
  markers: BloodMarkers;
  result: AnalysisResult;
  plan: CoachPlan;
}): Set<string> {
  const blob = JSON.stringify(input);
  return new Set(extractNumericTokens(blob));
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
  const benign = new Set(['1', '2', '3', '7', '30', '100']);
  for (const token of replyNumbers) {
    if (allowed.has(token)) continue;
    const normalized = token.endsWith('%') ? token.slice(0, -1) : token;
    if (allowed.has(normalized)) continue;
    if (benign.has(normalized)) continue;
    return false;
  }
  return true;
}
