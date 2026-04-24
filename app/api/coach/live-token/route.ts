import { NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: 'v1alpha',
      },
    });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        liveConnectConstraints: {
          model: `models/${LIVE_MODEL}`,
          config: {
            responseModalities: [Modality.AUDIO],
          },
        },
      },
    });

    if (!token.name) {
      return NextResponse.json({ error: 'Failed to provision Gemini Live token' }, { status: 500 });
    }

    return NextResponse.json({
      token: token.name,
      model: LIVE_MODEL,
    });
  } catch (error) {
    console.error('[coach/live-token] failed to create token:', error);
    return NextResponse.json({ error: 'Failed to create live token' }, { status: 500 });
  }
}
