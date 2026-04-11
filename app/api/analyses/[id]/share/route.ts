import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomBytes } from 'crypto';
import { getDb } from '@/lib/db';
import { analyses } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    const [row] = await db
      .select({ id: analyses.id, shareToken: analyses.shareToken })
      .from(analyses)
      .where(and(eq(analyses.id, Number(id)), eq(analyses.userId, userId)));

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Reuse existing token if already shared
    if (row.shareToken) {
      return NextResponse.json({ shareToken: row.shareToken });
    }

    const token = randomBytes(16).toString('hex');
    await db
      .update(analyses)
      .set({ shareToken: token })
      .where(eq(analyses.id, row.id));

    return NextResponse.json({ shareToken: token });
  } catch (error) {
    console.error('Failed to generate share token:', error);
    return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
  }
}
