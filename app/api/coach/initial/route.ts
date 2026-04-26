import { NextResponse } from 'next/server';
import { coachInitialRequestSchema } from '@/lib/schemas';
import { generateCoachPlan, generateInitialCoachMessage } from '@/lib/coachEngine';
import type { AnalysisResult, BloodMarkers, UserProfile } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = coachInitialRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[coach/initial] Validation failed:', parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { profile, markers, result } = parsed.data;
    const plan = generateCoachPlan(
      result as unknown as AnalysisResult,
      profile as UserProfile,
      markers as BloodMarkers,
    );
    const initialMessage = generateInitialCoachMessage(plan);

    return NextResponse.json({ plan, initialMessage });
  } catch (error) {
    console.error('Failed to generate initial coach response:', error);
    return NextResponse.json({ error: 'Failed to generate initial coach response' }, { status: 500 });
  }
}
