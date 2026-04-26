import { NextResponse } from 'next/server';
import { coachChatRequestSchema } from '@/lib/schemas';
import { generateCoachReply } from '@/lib/ai/gemini';
import { isCoachReplyGrounded } from '@/lib/ai/coachSafety';
import type { AnalysisResult, BloodMarkers, CoachMessage, CoachPlan, UserProfile } from '@/types';

const MAX_TOTAL_CHARS = 18_000;
const MIN_REPLY_CHARS = 120;
const MIN_BULLETS = 2;

function buildFallbackMessage(
  question: string,
  context: {
    result: AnalysisResult;
    coachPlan: CoachPlan;
  },
): string {
  const lower = question.toLowerCase();
  const calorieTarget =
    context.result.macros?.calories ??
    context.result.calorieTiers?.[0]?.dailyCalories ??
    null;
  const firstPriority = context.coachPlan.priorities[0];
  const secondPriority = context.coachPlan.priorities[1];
  const topRisks = context.result.risks.slice(0, 2).map((risk) => risk.replace(/_/g, ' ').toLowerCase());

  if (lower.includes('why')) {
    return [
      `Your plan is personalized for fat loss${calorieTarget ? `: ${calorieTarget} kcal/day` : ''} with focus on ${firstPriority?.title ?? 'your top priority'}.`,
      topRisks.length > 0
        ? `Your highest-impact risks right now are ${topRisks.join(' and ')}, so progress depends on consistency before adding more complexity.`
        : 'Your analysis suggests consistency is more important than adding new tactics right now.',
      `For this week, stick to "${firstPriority?.title ?? 'priority one'}"${secondPriority ? ` and "${secondPriority.title}"` : ''} every day, then reassess trend weight after 7 days.`,
    ].join(' ');
  }
  if (lower.includes('what should i do') || lower.includes('next')) {
    return `Start with your current${calorieTarget ? ` ${calorieTarget} kcal/day` : ''} target and run the first two coach priorities (${firstPriority?.title ?? 'priority one'}${secondPriority ? `, ${secondPriority.title}` : ''}) for 7 straight days. Then reassess adherence and trend weight before changing targets.`;
  }
  return `I could not generate a model response right now. Use your plan anchors (${calorieTarget ? `${calorieTarget} kcal/day and ` : ''}"${firstPriority?.title ?? 'priority one'}") as source of truth, and ask a narrower follow-up like "audit why my scale is flat this week."`;
}

function isLikelyGenericReply(text: string): boolean {
  const genericPatterns = [
    'everyone is different',
    'be patient',
    'consistency is key',
    'eat less and move more',
    'calorie deficit',
    'sleep and stress',
  ];
  const lower = text.toLowerCase();
  const genericHits = genericPatterns.filter((pattern) => lower.includes(pattern)).length;
  const hasNumericAnchor = /\b\d+(?:\.\d+)?%?\b/.test(text);
  const hasListLikeStructure = /(^|\n)\s*[-*]\s+/m.test(text) || /\b1\./.test(text);
  return genericHits >= 2 && (!hasNumericAnchor || !hasListLikeStructure);
}

function countBullets(text: string): number {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line)).length;
}

function isLowQualityReply(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < MIN_REPLY_CHARS) return true;
  if (countBullets(trimmed) < MIN_BULLETS) return true;
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = coachChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[coach/chat] Validation failed:', parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { analysisSnapshot, coachPlan, messages, userQuestion } = parsed.data;
    const totalChars = JSON.stringify(messages).length + userQuestion.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json(
        { error: 'Conversation payload too large. Please start a shorter follow-up.' },
        { status: 413 },
      );
    }

    const recentMessages = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
    let gemini = await generateCoachReply({
      profile: analysisSnapshot.profile as UserProfile,
      markers: analysisSnapshot.markers as BloodMarkers,
      result: analysisSnapshot.result as unknown as AnalysisResult,
      coachPlan: coachPlan as CoachPlan,
      recentMessages,
      userQuestion,
    });

    if (!gemini.text || isLowQualityReply(gemini.text)) {
      console.warn(
        '[coach/chat] first LLM reply too short/low-quality, retrying once.',
        gemini.text ? { chars: gemini.text.length, bullets: countBullets(gemini.text) } : { chars: 0, bullets: 0 },
      );
      const retry = await generateCoachReply({
        profile: analysisSnapshot.profile as UserProfile,
        markers: analysisSnapshot.markers as BloodMarkers,
        result: analysisSnapshot.result as unknown as AnalysisResult,
        coachPlan: coachPlan as CoachPlan,
        recentMessages,
        userQuestion: `${userQuestion}\n\nFormat strictly: one short direct sentence, then 4-8 bullets with at least two concrete anchors from this user's data.`,
      });
      if (retry.text && (!gemini.text || retry.text.length > gemini.text.length)) {
        gemini = retry;
      }
    }

    const grounded = gemini.text
      ? isCoachReplyGrounded(gemini.text, {
        profile: analysisSnapshot.profile,
        markers: analysisSnapshot.markers,
        result: analysisSnapshot.result as unknown as AnalysisResult,
        plan: coachPlan as CoachPlan,
      })
      : false;

    if (!gemini.text) {
      console.warn('[coach/chat] fallback firing: empty LLM text (check GEMINI_API_KEY or gemini.ts error log above)');
    } else if (!grounded) {
      console.warn('[coach/chat] fallback firing: grounding check rejected LLM reply. Reply was:\n', gemini.text);
    } else if (isLowQualityReply(gemini.text)) {
      console.warn(
        '[coach/chat] fallback firing: low-quality LLM reply detected. Reply was:\n',
        gemini.text,
      );
    } else if (isLikelyGenericReply(gemini.text)) {
      console.warn('[coach/chat] fallback firing: generic LLM reply detected. Reply was:\n', gemini.text);
    } else {
      console.log('[coach/chat] LLM reply accepted, length:', gemini.text.length);
    }

    const generic = gemini.text ? isLikelyGenericReply(gemini.text) : false;
    const lowQuality = gemini.text ? isLowQualityReply(gemini.text) : true;
    // Always surface model output to the user when present.
    // Fallback is only used when the model returns empty text.
    const responseText = gemini.text
      ? gemini.text
      : buildFallbackMessage(userQuestion, {
          result: analysisSnapshot.result as unknown as AnalysisResult,
          coachPlan: coachPlan as CoachPlan,
        });
    const message: CoachMessage = {
      id: `coach-llm-${Date.now()}`,
      role: 'assistant',
      source: 'llm_chat',
      text: responseText,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      message,
      telemetry: {
        ...gemini.telemetry,
        safetyState: gemini.text && (!grounded || generic || lowQuality) ? 'blocked' : gemini.telemetry.safetyState,
        fallbackUsed: gemini.telemetry.fallbackUsed || !gemini.text || !grounded || generic || lowQuality,
      },
    });
  } catch (error) {
    console.error('Failed to generate coach chat response:', error);
    return NextResponse.json({ error: 'Failed to generate coach chat response' }, { status: 500 });
  }
}
