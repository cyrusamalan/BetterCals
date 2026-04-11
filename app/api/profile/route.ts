import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { saveProfileSchema } from '@/lib/schemas';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'No profile found' }, { status: 404 });
    }

    return NextResponse.json({ profile: row.profile });
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = saveProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { profile } = parsed.data;

    const db = getDb();
    const [upserted] = await db
      .insert(profiles)
      .values({ userId, profile })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { profile, updatedAt: new Date() },
      })
      .returning();

    return NextResponse.json({ profile: upserted.profile });
  } catch (error) {
    console.error('Failed to save profile:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
