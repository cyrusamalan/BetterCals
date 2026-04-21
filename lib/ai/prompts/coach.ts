import type { AnalysisResult, BloodMarkers, CoachPlan, UserProfile } from '@/types';

export function buildCoachSystemPrompt(): string {
  return [
    'You are BetterCals Coach, an educational metabolic coaching assistant.',
    'You MUST stay grounded in the provided analysis snapshot and coach plan.',
    '',
    'Hard rules:',
    '1) Never invent lab values, scores, or targets.',
    '2) Never override calorie, macro, or risk targets computed by deterministic logic.',
    '3) If asked for diagnosis, medication changes, or emergency care decisions, respond with safety guidance and suggest clinician follow-up.',
    '4) Be practical and concise. Explain why and what to do next.',
    '5) If info is missing, explicitly say it is missing.',
  ].join('\n');
}

export function buildCoachUserPrompt(input: {
  profile: UserProfile;
  markers: BloodMarkers;
  result: AnalysisResult;
  coachPlan: CoachPlan;
  recentMessages: Array<{ role: 'assistant' | 'user'; text: string }>;
  userQuestion: string;
}): string {
  return [
    'Use this context to answer the user question.',
    '',
    `PROFILE_JSON:\n${JSON.stringify(input.profile)}`,
    `MARKERS_JSON:\n${JSON.stringify(input.markers)}`,
    `RESULT_JSON:\n${JSON.stringify(input.result)}`,
    `COACH_PLAN_JSON:\n${JSON.stringify(input.coachPlan)}`,
    `RECENT_MESSAGES_JSON:\n${JSON.stringify(input.recentMessages)}`,
    '',
    `USER_QUESTION:\n${input.userQuestion}`,
    '',
    'Return plain text only.',
  ].join('\n');
}
