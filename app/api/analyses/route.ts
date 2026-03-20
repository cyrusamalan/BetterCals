import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(analyses).orderBy(desc(analyses.createdAt)).limit(20);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch analyses:', error);
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profile, markers, result } = body;

    if (!profile || !markers || !result) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    const [inserted] = await db.insert(analyses).values({
      profile,
      markers,
      result,
    }).returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error('Failed to save analysis:', error);
    return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
  }
}
