import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { analyses } from '@/lib/db/schema';
import { saveAnalysisSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rateLimit';
import { generateDietPlan } from '@/lib/ai/dietPlan';
import type { AnalysisResult } from '@/types';

const requestSchema = z.object({
  analysisId: z.number().int().positive().optional(),
  profile: saveAnalysisSchema.shape.profile,
  markers: saveAnalysisSchema.shape.markers,
  result: saveAnalysisSchema.shape.result,
});

const RATE_LIMIT_HITS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
    const key = `diet-plan:${userId ?? ip}`;
    const rl = checkRateLimit(key, RATE_LIMIT_HITS, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { analysisId, profile, markers, result } = parsed.data;

    const outcome = await generateDietPlan({
      profile,
      markers,
      result: result as unknown as AnalysisResult,
    });

    if (analysisId && userId) {
      try {
        const db = getDb();
        const [row] = await db
          .select()
          .from(analyses)
          .where(and(eq(analyses.id, analysisId), eq(analyses.userId, userId)))
          .limit(1);
        if (row) {
          const merged = { ...(row.result as Record<string, unknown>), dietPlan: outcome.plan };
          await db
            .update(analyses)
            .set({ result: merged })
            .where(and(eq(analyses.id, analysisId), eq(analyses.userId, userId)));
        }
      } catch (dbErr) {
        console.error('Failed to persist diet plan:', dbErr);
        // Non-fatal — still return the plan to the client.
      }
    }

    return NextResponse.json({
      dietPlan: outcome.plan,
      fallbackUsed: outcome.fallbackUsed,
      ...(outcome.error ? { warning: outcome.error } : {}),
    });
  } catch (error) {
    console.error('Diet plan generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate diet plan' }, { status: 500 });
  }
}
