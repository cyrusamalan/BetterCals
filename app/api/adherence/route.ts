import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, between, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { adherence } from '@/lib/db/schema';
import { upsertAdherenceSchema, listAdherenceQuerySchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const parsed = listAdherenceQuerySchema.safeParse({
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query params', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { from, to, limit } = parsed.data;

    const db = getDb();
    const where = from && to
      ? and(eq(adherence.userId, userId), between(adherence.eventDate, from, to))
      : eq(adherence.userId, userId);

    const rows = await db
      .select()
      .from(adherence)
      .where(where)
      .orderBy(desc(adherence.eventDate))
      .limit(limit);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch adherence:', error);
    return NextResponse.json({ error: 'Failed to fetch adherence' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = checkRateLimit(`adherence:${userId}`, 120, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = upsertAdherenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { date, checks, totalCount } = parsed.data;
    const completedCount = Object.values(checks).filter((v) => v === 'yes').length;

    const db = getDb();
    const [row] = await db
      .insert(adherence)
      .values({ userId, eventDate: date, checks, completedCount, totalCount })
      .onConflictDoUpdate({
        target: [adherence.userId, adherence.eventDate],
        set: {
          checks,
          completedCount,
          totalCount,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    return NextResponse.json(row);
  } catch (error) {
    console.error('Failed to upsert adherence:', error);
    return NextResponse.json({ error: 'Failed to save adherence' }, { status: 500 });
  }
}
