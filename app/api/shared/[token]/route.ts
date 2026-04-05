import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token || token.length !== 32) {
      return NextResponse.json({ error: 'Invalid share token' }, { status: 400 });
    }

    const db = getDb();
    const [row] = await db
      .select({
        id: analyses.id,
        createdAt: analyses.createdAt,
        profile: analyses.profile,
        markers: analyses.markers,
        result: analyses.result,
      })
      .from(analyses)
      .where(eq(analyses.shareToken, token));

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('Failed to fetch shared analysis:', error);
    return NextResponse.json({ error: 'Failed to fetch shared analysis' }, { status: 500 });
  }
}
