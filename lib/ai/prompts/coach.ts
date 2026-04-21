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
    '6) Personalize every answer using this exact user context, not generic fitness advice.',
    '7) Include at least 2 concrete anchors from context (example: calorie target, named risk, named marker, or a specific coach priority title).',
    '8) If the question is "why am I not losing weight" style, audit likely blockers against the current plan and provide a one-week debug checklist tied to this user targets.',
    '9) Keep response to 4-8 short bullets. No preamble. No markdown tables.',
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
    'Answer format:',
    '- First line: one-sentence direct answer.',
    '- Then 4-8 bullets that reference concrete user data.',
    '- End with one optional "If you want, I can..." action.',
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
