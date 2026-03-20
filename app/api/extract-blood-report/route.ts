import { NextResponse } from 'next/server';
import type { BloodMarkers } from '@/types';
import pdfParse from 'pdf-parse';
import { parseBloodReport } from '@/lib/bloodParser';

// Defaults to DeepSeek cloud API; override with LLM_BASE_URL for local models
// e.g. Ollama: http://localhost:11434/v1    LM Studio: http://localhost:1234/v1
const DEFAULT_BASE_URL = 'https://api.deepseek.com';

/**
 * Physiological plausibility ranges — values outside these are almost certainly
 * extraction errors (grabbed a reference range, date fragment, or unrelated number).
 */
const PLAUSIBLE_RANGES: Record<keyof BloodMarkers, { min: number; max: number }> = {
  glucose: { min: 20, max: 600 },
  hba1c: { min: 3, max: 20 },
  totalCholesterol: { min: 50, max: 500 },
  ldl: { min: 10, max: 400 },
  hdl: { min: 5, max: 150 },
  triglycerides: { min: 20, max: 2000 },
  tsh: { min: 0.01, max: 100 },
  vitaminD: { min: 3, max: 200 },
  vitaminB12: { min: 50, max: 5000 },
  ferritin: { min: 1, max: 3000 },
  iron: { min: 5, max: 500 },
  alt: { min: 1, max: 1000 },
  ast: { min: 1, max: 1000 },
  albumin: { min: 1, max: 7 },
  creatinine: { min: 0.1, max: 20 },
  uricAcid: { min: 0.5, max: 20 },
  fastingInsulin: { min: 0.5, max: 300 },
  apoB: { min: 10, max: 300 },
  hsCRP: { min: 0.01, max: 50 },
  nonHdl: { min: 20, max: 400 },
};

function sanitizeBloodMarkers(input: unknown): BloodMarkers {
  if (!input || typeof input !== 'object') return {};
  const out: BloodMarkers = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    // Reject values outside physiological plausibility
    const range = PLAUSIBLE_RANGES[k as keyof BloodMarkers];
    if (range && (v < range.min || v > range.max)) continue;
    out[k as keyof BloodMarkers] = v;
  }
  return out;
}

function buildSystemPrompt(): string {
  return [
    'You are a medical lab report data extractor. Your job is to extract ONLY the blood marker values that are ACTUALLY PRESENT in the lab report text.',
    '',
    'CRITICAL RULES:',
    '1. ONLY extract markers that are explicitly tested in this report. If a test was NOT ordered (e.g. no lipid panel, no TSH test), return null for those markers.',
    '2. Use the CURRENT patient result value — NOT the reference range, NOT the previous result, NOT flag codes, NOT footnote text.',
    '3. Preserve decimals exactly (e.g. 1.18, 5.2, 15.3).',
    '4. If you are NOT CERTAIN a marker was tested, use null. It is far better to miss a value than to hallucinate one.',
    '5. Ignore reference ranges, educational notes, footnotes, and disclaimer text — these are NOT patient results.',
    '',
    'PDF TEXT EXTRACTION ISSUES:',
    'PDF text extraction often mangles multi-column table layouts from ANY lab provider. Columns may merge together without spaces.',
    'For example, a row with columns [Current Result] [Previous Result] [Date] [Unit] [Range] might appear as:',
    '  "131706/26/2024IU/L0-44"',
    'This means: current=13, previous=17, date=06/26/2024, unit=IU/L, range=0-44.',
    'You MUST carefully separate concatenated values. Tips:',
    '- Look for date patterns (MM/DD/YYYY) as column boundaries.',
    '- Look for unit strings (mg/dL, IU/L, ng/mL, %, etc.) as column boundaries.',
    '- Look for reference range patterns (e.g. "0-44", "70-100", "4.8-5.6") as column boundaries.',
    '- If two numbers are smashed together, the first is usually the current result and the second is the previous.',
    '- Lab site codes (e.g. "01" appearing after test names) are NOT values — ignore them.',
    '',
    'COMMON TEST NAME VARIANTS:',
    '- Glucose / Fasting Glucose → glucose',
    '- Hemoglobin A1c / HbA1c → hba1c',
    '- Total Cholesterol / Cholesterol, Total → totalCholesterol',
    '- LDL Cholesterol / LDL-C / LDL Calc → ldl',
    '- HDL Cholesterol / HDL-C → hdl',
    '- Triglycerides → triglycerides',
    '- TSH / Thyroid Stimulating Hormone → tsh',
    '- Vitamin D, 25-Hydroxy / 25-OH Vitamin D → vitaminD',
    '- Vitamin B12 / Cobalamin → vitaminB12',
    '- Ferritin → ferritin',
    '- Iron / Serum Iron → iron',
    '- ALT (SGPT) / Alanine Aminotransferase → alt',
    '- AST (SGOT) / Aspartate Aminotransferase → ast',
    '- Albumin → albumin',
    '- Creatinine → creatinine',
    '- Uric Acid / Urate → uricAcid',
    '- Fasting Insulin / Insulin → fastingInsulin',
    '- Apo B / Apolipoprotein B → apoB',
    '- hs-CRP / High Sensitivity C-Reactive Protein → hsCRP',
    '',
    'Return ONLY strict JSON:',
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
    'Never include commentary, markdown, or code fences.',
  ].join('\n');
}

async function callLLMForExtraction(apiKey: string, reportText: string) {
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = process.env.LLM_MODEL || 'deepseek-chat';
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Local models (Ollama, LM Studio) don't need auth
  if (!isLocal) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: [
            'Extract blood marker values from this lab report text.',
            'Remember: ONLY include markers that were actually tested. Return null for any marker not present in the report.',
            '',
            '--- LAB REPORT TEXT ---',
            reportText,
            '--- END ---',
          ].join('\n'),
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
        { error: `LLM extraction failed (${model}): ${errText.slice(0, 250)}` },
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
        { error: `No extraction output from model (${model})` },
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
            { error: `Model returned invalid JSON (${model})` },
            { status: 502 },
          ),
        };
      }
    } else {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: `Model returned invalid JSON (${model})` },
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
    const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    const apiKey = process.env.DEEPSEEK_API_KEY || '';

    if (!isLocal && !apiKey) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY is not configured (required for cloud API)' },
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

    // Step 2: Send text to LLM for structured extraction
    const modelName = process.env.LLM_MODEL || 'deepseek-chat';
    const llmResult = await callLLMForExtraction(apiKey, text);

    if (llmResult.ok) {
      const markers = llmResult.markers;
      if (Object.keys(markers).length > 0) {
        return NextResponse.json({ markers, modelUsed: modelName });
      }
    }

    // Step 3: Fall back to local regex parser if LLM fails or returns empty
    const fallbackMarkers = sanitizeBloodMarkers(parseBloodReport(text));
    if (Object.keys(fallbackMarkers).length > 0) {
      return NextResponse.json({
        markers: fallbackMarkers,
        modelUsed: 'local-fallback-parser',
        warning:
          `${modelName} returned no results. Used local parser fallback.`,
      });
    }

    // If both methods failed, return the LLM error or a generic one
    if (!llmResult.ok) {
      return llmResult.response;
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
