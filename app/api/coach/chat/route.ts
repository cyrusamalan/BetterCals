import { NextResponse } from 'next/server';
import { coachChatRequestSchema } from '@/lib/schemas';
import { generateCoachReply } from '@/lib/ai/gemini';
import { isCoachReplyGrounded } from '@/lib/ai/coachSafety';
import type { AnalysisResult, BloodMarkers, CoachMessage, CoachPlan, UserProfile } from '@/types';

const MAX_TOTAL_CHARS = 18_000;

function buildFallbackMessage(question: string): string {
  const lower = question.toLowerCase();
  if (lower.includes('why')) {
    return 'The coach plan prioritizes your highest-impact risks first and keeps week-one actions simple so adherence stays high. I can break down any specific priority if you want.';
  }
  if (lower.includes('what should i do') || lower.includes('next')) {
    return 'Start with the first two weekly actions in your coach plan and keep them consistent for 7 days. Then reassess markers and adherence before changing targets.';
  }
  return 'I could not generate a model response right now. Use the coach priorities and weekly actions as your source of truth, and ask a narrower follow-up question.';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = coachChatRequestSchema.safeParse(body);
    if (!parsed.success) {
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
    const gemini = await generateCoachReply({
      profile: analysisSnapshot.profile as UserProfile,
      markers: analysisSnapshot.markers as BloodMarkers,
      result: analysisSnapshot.result as unknown as AnalysisResult,
      coachPlan: coachPlan as CoachPlan,
      recentMessages,
      userQuestion,
    });

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
    } else {
      console.log('[coach/chat] LLM reply accepted, length:', gemini.text.length);
    }

    const responseText = gemini.text && grounded ? gemini.text : buildFallbackMessage(userQuestion);
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
        safetyState: gemini.text && !grounded ? 'blocked' : gemini.telemetry.safetyState,
        fallbackUsed: gemini.telemetry.fallbackUsed || !gemini.text || !grounded,
      },
    });
  } catch (error) {
    console.error('Failed to generate coach chat response:', error);
    return NextResponse.json({ error: 'Failed to generate coach chat response' }, { status: 500 });
  }
}
