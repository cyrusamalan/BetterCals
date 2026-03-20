import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const [row] = await db.select().from(analyses).where(eq(analyses.id, Number(id)));
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (error) {
    console.error('Failed to fetch analysis:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.delete(analyses).where(eq(analyses.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete analysis:', error);
    return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 });
  }
}
