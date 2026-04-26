import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { coachHistory } from '@/lib/db/schema';
import { listCoachHistoryQuerySchema, saveCoachHistoryEventSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rateLimit';

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|connection|timeout|temporar|unavailable|network/i.test(message);
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`coach-history:${userId}`, 120, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = saveCoachHistoryEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { source, role, message, analysisId, metadata } = parsed.data;
    const db = getDb();
    let inserted: typeof coachHistory.$inferSelect | undefined;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const [row] = await db
          .insert(coachHistory)
          .values({
            userId,
            eventDateUtc: utcDateString(),
            source,
            role,
            message,
            analysisId,
            metadata,
          })
          .returning();
        inserted = row;
        break;
      } catch (error) {
        lastError = error;
        if (!isTransientDbError(error) || attempt === 2) {
          throw error;
        }
        await sleep(250 * (attempt + 1));
      }
    }

    if (!inserted) {
      throw lastError instanceof Error ? lastError : new Error('Failed to persist coach history event');
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error('Failed to save coach history event:', error);
    return NextResponse.json({ error: 'Failed to save coach history event' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = listCoachHistoryQuerySchema.safeParse({
      date: url.searchParams.get('date') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query params', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { date, limit } = parsed.data;
    const db = getDb();
    const rows = await db
      .select()
      .from(coachHistory)
      .where(
        date
          ? and(eq(coachHistory.userId, userId), eq(coachHistory.eventDateUtc, date))
          : eq(coachHistory.userId, userId),
      )
      .orderBy(desc(coachHistory.createdAt))
      .limit(limit);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch coach history events:', error);
    return NextResponse.json({ error: 'Failed to fetch coach history events' }, { status: 500 });
  }
}
