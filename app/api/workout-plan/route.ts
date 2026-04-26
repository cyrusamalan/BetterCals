import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getDb } from '@/lib/db';
import { workoutPlanHistory } from '@/lib/db/schema';
import { generateWorkoutPlan } from '@/lib/ai/workoutPlan';
import { generateWorkoutPlanRequestSchema } from '@/lib/schemas';
import type { AnalysisResult, BloodMarkers, UserProfile } from '@/types';

const RATE_LIMIT_HITS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const analysisIdRaw = url.searchParams.get('analysisId');
    const limitRaw = url.searchParams.get('limit');
    const limit = Math.max(1, Math.min(20, Number(limitRaw ?? '1')));

    const db = getDb();
    if (analysisIdRaw) {
      const analysisId = Number(analysisIdRaw);
      if (!Number.isFinite(analysisId) || analysisId <= 0) {
        return NextResponse.json({ error: 'Invalid analysisId' }, { status: 400 });
      }
      const rows = await db
        .select()
        .from(workoutPlanHistory)
        .where(and(eq(workoutPlanHistory.userId, userId), eq(workoutPlanHistory.analysisId, analysisId)))
        .orderBy(desc(workoutPlanHistory.createdAt))
        .limit(limit);
      return NextResponse.json(rows);
    }

    const rows = await db
      .select()
      .from(workoutPlanHistory)
      .where(eq(workoutPlanHistory.userId, userId))
      .orderBy(desc(workoutPlanHistory.createdAt))
      .limit(limit);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to load workout plans:', error);
    return NextResponse.json({ error: 'Failed to load workout plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
    const key = `workout-plan:${userId ?? ip}`;
    const rl = checkRateLimit(key, RATE_LIMIT_HITS, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = generateWorkoutPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { analysisId, profile, markers, result, constraints, preferences } = parsed.data;
    const outcome = await generateWorkoutPlan({
      profile: profile as UserProfile,
      markers: markers as BloodMarkers,
      result: result as unknown as AnalysisResult,
      constraints,
      preferences,
    });

    const eventDateUtc = new Date().toISOString().slice(0, 10);
    const db = getDb();
    const [saved] = await db.insert(workoutPlanHistory).values({
      userId,
      analysisId: analysisId ?? null,
      eventDateUtc,
      constraints,
      preferences,
      plan: outcome.plan as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({
      workoutPlan: outcome.plan,
      record: saved,
      fallbackUsed: outcome.fallbackUsed,
      ...(outcome.error ? { warning: outcome.error } : {}),
    });
  } catch (error) {
    console.error('Workout plan generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate workout plan' }, { status: 500 });
  }
}
