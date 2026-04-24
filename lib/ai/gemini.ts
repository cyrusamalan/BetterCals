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
  const configured = process.env.GEMINI_MODEL?.trim();
  if (!configured) throw new Error('GEMINI_MODEL is missing');
  return configured;
}

function getFallbackModelName(primary: string): string {
  const configured = process.env.GEMINI_FALLBACK_MODEL?.trim();
  return configured || primary;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryOrFailover(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /\b(429|503)\b/.test(message) || /high demand|resource exhausted|unavailable/i.test(message);
}

async function generateOnce(
  modelName: string,
  input: ChatInput,
): Promise<{ text: string; usage?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }> {
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

  return {
    text: response.response.text().trim(),
    usage: response.response.usageMetadata,
  };
}

export async function generateCoachReply(input: ChatInput): Promise<ChatOutput> {
  const started = Date.now();
  const modelName = getModelName();
  const fallbackModel = getFallbackModelName(modelName);
  try {
    let selectedModel = modelName;
    let result: Awaited<ReturnType<typeof generateOnce>> | null = null;

    try {
      result = await generateOnce(modelName, input);
    } catch (primaryErr) {
      if (!shouldRetryOrFailover(primaryErr)) {
        throw primaryErr;
      }
      console.warn('[coach/gemini] primary model temporarily unavailable, retrying once before failover:', modelName);
      await sleep(300);
      try {
        result = await generateOnce(modelName, input);
      } catch (retryErr) {
        if (!shouldRetryOrFailover(retryErr)) {
          throw retryErr;
        }
        if (fallbackModel === modelName) {
          throw retryErr;
        }
        console.warn('[coach/gemini] retry failed, failing over to fallback model:', fallbackModel);
        selectedModel = fallbackModel;
        await sleep(600);
        result = await generateOnce(fallbackModel, input);
      }
    }

    const text = result?.text?.trim() ?? '';
    if (!text) throw new Error('Empty Gemini response');

    const usage = result?.usage;
    return {
      text,
      telemetry: {
        model: selectedModel,
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
        model: `${modelName}${fallbackModel !== modelName ? `|fallback:${fallbackModel}` : ''}`,
        latencyMs: Date.now() - started,
        safetyState: 'unknown',
        fallbackUsed: true,
      },
    };
  }
}
