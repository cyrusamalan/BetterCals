import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildCoachSystemPrompt, buildCoachUserPrompt } from '@/lib/ai/prompts/coach';
import type {
  AnalysisResult,
  BloodMarkers,
  CoachPlan,
  CoachProviderTelemetry,
  UserProfile,
} from '@/types';

type ChatInput = {
  profile: UserProfile;
  markers: BloodMarkers;
  result: AnalysisResult;
  coachPlan: CoachPlan;
  recentMessages: Array<{ role: 'assistant' | 'user'; text: string }>;
  userQuestion: string;
};

type ChatOutput = {
  text: string;
  telemetry: CoachProviderTelemetry;
};

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenerativeAI(apiKey);
}

function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
}

export async function generateCoachReply(input: ChatInput): Promise<ChatOutput> {
  const started = Date.now();
  const modelName = getModelName();
  try {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: buildCoachSystemPrompt(),
    });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildCoachUserPrompt(input) }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 700,
      },
    });

    const text = response.response.text().trim();
    if (!text) throw new Error('Empty Gemini response');

    const usage = response.response.usageMetadata;
    return {
      text,
      telemetry: {
        model: modelName,
        latencyMs: Date.now() - started,
        usage: {
          promptTokens: usage?.promptTokenCount,
          completionTokens: usage?.candidatesTokenCount,
          totalTokens: usage?.totalTokenCount,
        },
        safetyState: 'safe',
        fallbackUsed: false,
      },
    };
  } catch (err) {
    console.error('[coach/gemini] LLM call failed:', err instanceof Error ? err.message : err);
    return {
      text: '',
      telemetry: {
        model: modelName,
        latencyMs: Date.now() - started,
        safetyState: 'unknown',
        fallbackUsed: true,
      },
    };
  }
}
