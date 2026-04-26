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

function getCandidateModelNames(primary: string): string[] {
  const configuredFallback = process.env.GEMINI_FALLBACK_MODEL?.trim();
  const configuredList = process.env.GEMINI_MODEL_CANDIDATES
    ?.split(',')
    .map((m) => m.trim())
    .filter(Boolean) ?? [];
  return Array.from(new Set([primary, ...configuredList, configuredFallback].filter(Boolean))) as string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryOrFailover(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /\b(429|503)\b/.test(message) || /high demand|resource exhausted|unavailable/i.test(message);
}

function isUnsupportedModelError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /\b404\b/.test(message) && /not found|not supported/i.test(message);
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
  const primaryModel = getModelName();
  const candidateModels = getCandidateModelNames(primaryModel);
  try {
    let selectedModel = primaryModel;
    let result: Awaited<ReturnType<typeof generateOnce>> | null = null;
    let lastError: unknown = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      selectedModel = model;
      try {
        result = await generateOnce(model, input);
        break;
      } catch (firstErr) {
        if (isUnsupportedModelError(firstErr)) {
          const nextModel = candidateModels[i + 1];
          if (nextModel) {
            console.warn('[coach/gemini] model unavailable for this API key/version, skipping to next model:', nextModel);
            continue;
          }
          throw firstErr;
        }

        if (!shouldRetryOrFailover(firstErr)) {
          throw firstErr;
        }

        const isPrimary = i === 0;
        console.warn(
          `[coach/gemini] ${isPrimary ? 'primary' : 'fallback'} model temporarily unavailable, retrying once before next fallback:`,
          model,
        );
        await sleep(300);

        try {
          result = await generateOnce(model, input);
          break;
        } catch (retryErr) {
          lastError = retryErr;
          if (isUnsupportedModelError(retryErr)) {
            const nextModel = candidateModels[i + 1];
            if (nextModel) {
              console.warn('[coach/gemini] model unsupported after retry, skipping to next model:', nextModel);
              continue;
            }
            throw retryErr;
          }
          if (!shouldRetryOrFailover(retryErr)) {
            throw retryErr;
          }

          const nextModel = candidateModels[i + 1];
          if (nextModel) {
            console.warn('[coach/gemini] retry failed, failing over to next model:', nextModel);
            await sleep(600);
            continue;
          }
        }
      }
    }

    if (!result) {
      throw lastError instanceof Error ? lastError : new Error('All Gemini models failed');
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
        fallbackUsed: selectedModel !== primaryModel,
      },
    };
  } catch (err) {
    console.error('[coach/gemini] LLM call failed:', err instanceof Error ? err.message : err);
    return {
      text: '',
      telemetry: {
        model: candidateModels.join('|'),
        latencyMs: Date.now() - started,
        safetyState: 'unknown',
        fallbackUsed: true,
      },
    };
  }
}
