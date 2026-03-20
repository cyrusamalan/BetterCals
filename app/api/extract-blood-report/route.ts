import { NextResponse } from 'next/server';
import type { BloodMarkers } from '@/types';
import pdfParse from 'pdf-parse';
import { parseBloodReport } from '@/lib/bloodParser';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

function sanitizeBloodMarkers(input: unknown): BloodMarkers {
  if (!input || typeof input !== 'object') return {};
  const out: BloodMarkers = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    out[k as keyof BloodMarkers] = v;
  }
  return out;
}

function buildSystemPrompt(): string {
  return [
    'You extract blood marker numeric values from lab reports.',
    'Return ONLY strict JSON with this shape:',
    '{',
    '  "markers": {',
    '    "glucose": number | null,',
    '    "hba1c": number | null,',
    '    "totalCholesterol": number | null,',
    '    "ldl": number | null,',
    '    "hdl": number | null,',
    '    "triglycerides": number | null,',
    '    "tsh": number | null,',
    '    "vitaminD": number | null,',
    '    "vitaminB12": number | null,',
    '    "ferritin": number | null,',
    '    "iron": number | null,',
    '    "alt": number | null,',
    '    "ast": number | null,',
    '    "albumin": number | null,',
    '    "creatinine": number | null,',
    '    "uricAcid": number | null,',
    '    "fastingInsulin": number | null,',
    '    "apoB": number | null,',
    '    "hsCRP": number | null',
    '  }',
    '}',
    '',
    'Rules:',
    '- Use the CURRENT measured patient result, NOT reference ranges and NOT previous values.',
    '- Preserve decimals exactly (example: 1.18, 5.2, 15.3).',
    '- Do not infer missing values. Use null for unknown markers.',
    '- Never include commentary, markdown, or code fences.',
    '- The text may have garbled formatting from PDF extraction. Use your best judgment to pair marker names with their values.',
    '- Common aliases: "ALT (SGPT)" = alt, "AST (SGOT)" = ast, "Hemoglobin A1c" = hba1c, "Vitamin D, 25-Hydroxy" = vitaminD, "hs-CRP" = hsCRP, "Apo B" = apoB.',
  ].join('\n');
}

async function callDeepSeekForExtraction(apiKey: string, reportText: string) {
  const resp = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: `Extract blood marker values from this lab report text:\n\n${reportText}`,
        },
      ],
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: `DeepSeek extraction failed: ${errText.slice(0, 250)}` },
        { status: 502 },
      ),
    };
  }

  const payload = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const modelText = payload.choices?.[0]?.message?.content;
  if (!modelText) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'No extraction output from DeepSeek' },
        { status: 502 },
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(modelText);
  } catch {
    // Try to extract JSON from possibly wrapped response
    const jsonStart = modelText.indexOf('{');
    const jsonEnd = modelText.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        parsed = JSON.parse(modelText.slice(jsonStart, jsonEnd + 1));
      } catch {
        return {
          ok: false as const,
          response: NextResponse.json(
            { error: 'DeepSeek returned invalid JSON' },
            { status: 502 },
          ),
        };
      }
    } else {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: 'DeepSeek returned invalid JSON' },
          { status: 502 },
        ),
      };
    }
  }

  // Handle both { markers: {...} } and flat { glucose: ..., ldl: ... } shapes
  const rawMarkers =
    (parsed as { markers?: unknown }).markers ?? parsed;
  const markers = sanitizeBloodMarkers(rawMarkers);

  return {
    ok: true as const,
    markers,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY is not configured' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing uploaded file' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return NextResponse.json(
        {
          error:
            'Image extraction is not yet enabled server-side. Please upload a PDF.',
        },
        { status: 400 },
      );
    }

    // Step 1: Extract raw text from PDF
    const pdfData = await pdfParse(bytes);
    const text = pdfData.text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: 'Could not read text from PDF' },
        { status: 400 },
      );
    }

    // Step 2: Send text to DeepSeek for structured extraction
    const deepseekResult = await callDeepSeekForExtraction(apiKey, text);

    if (deepseekResult.ok) {
      const markers = deepseekResult.markers;
      if (Object.keys(markers).length > 0) {
        return NextResponse.json({ markers, modelUsed: 'deepseek-chat' });
      }
    }

    // Step 3: Fall back to local regex parser if DeepSeek fails or returns empty
    const fallbackMarkers = sanitizeBloodMarkers(parseBloodReport(text));
    if (Object.keys(fallbackMarkers).length > 0) {
      return NextResponse.json({
        markers: fallbackMarkers,
        modelUsed: 'local-fallback-parser',
        warning:
          'DeepSeek returned no results. Used local parser fallback.',
      });
    }

    // If both methods failed, return the DeepSeek error or a generic one
    if (!deepseekResult.ok) {
      return deepseekResult.response;
    }

    return NextResponse.json(
      { error: 'No blood markers could be extracted from this report' },
      { status: 422 },
    );
  } catch (error) {
    console.error('Failed to extract blood report:', error);
    return NextResponse.json(
      { error: 'Failed to extract blood report' },
      { status: 500 },
    );
  }
}
