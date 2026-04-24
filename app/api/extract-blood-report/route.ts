import { NextResponse } from 'next/server';
import type { BloodMarkers } from '@/types';
import pdfParse from 'pdf-parse';
import { parseBloodReport, PLAUSIBLE_RANGES } from '@/lib/bloodParser';
import { checkRateLimit } from '@/lib/rateLimit';
import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Defaults to DeepSeek cloud API; override with LLM_BASE_URL for local models
// e.g. Ollama: http://localhost:11434/v1    LM Studio: http://localhost:1234/v1
const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

async function extractPdfTextWithPdfJs(bytes: Buffer): Promise<string> {
  try {
    const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();
    const loadingTask = getDocument({
      data: new Uint8Array(bytes),
    });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => {
          if ('str' in item && typeof item.str === 'string') return item.str;
          return '';
        })
        .join(' ')
        .trim();
      if (pageText) pages.push(pageText);
    }

    return pages.join('\n').trim();
  } catch (error) {
    console.warn('[extract-blood-report] pdfjs fallback failed:', error);
    return '';
  }
}

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

function parseExtractionJson(modelText: string): unknown | null {
  const normalized = modelText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const candidates = [normalized];
  const start = normalized.indexOf('{');
  const end = normalized.lastIndexOf('}');
  if (start >= 0 && end > start) {
    candidates.push(normalized.slice(start, end + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        // Handle common malformed JSON issue from model output.
        const withoutTrailingCommas = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(withoutTrailingCommas);
      } catch {
        // Continue trying other candidates.
      }
    }
  }
  return null;
}

async function repairJsonWithGemini(client: GoogleGenerativeAI, rawText: string, model: string): Promise<unknown | null> {
  try {
    const repairModel = client.getGenerativeModel({ model });
    const repairResponse = await repairModel.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: [
            'Convert the following into strict valid JSON only.',
            'Do not add explanations or markdown.',
            '',
            rawText,
          ].join('\n'),
        }],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });
    const repairedText = repairResponse.response.text();
    if (!repairedText) return null;
    return parseExtractionJson(repairedText);
  } catch {
    return null;
  }
}

function extractMarkersFromParsed(parsed: unknown): BloodMarkers {
  const rawMarkers = (parsed as { markers?: unknown }).markers ?? parsed;
  return sanitizeBloodMarkers(rawMarkers);
}

function normalizeExtractedMarkers(markers: BloodMarkers): BloodMarkers {
  return sanitizeBloodMarkers(markers);
}

function hasMarkers(markers: BloodMarkers): boolean {
  return Object.keys(markers).length > 0;
}

function mergeMissingMarkers(primary: BloodMarkers, secondary: BloodMarkers): BloodMarkers {
  const merged: BloodMarkers = { ...primary };
  for (const [key, value] of Object.entries(secondary) as Array<[keyof BloodMarkers, number | undefined]>) {
    if (value === undefined) continue;
    if (merged[key] === undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function buildPdfCompletenessPrompt(existing: BloodMarkers): string {
  const existingJson = JSON.stringify(existing);
  return [
    'You previously extracted markers from this blood report PDF.',
    'Re-check the entire PDF carefully and fill in ANY missing markers below if present.',
    'Keep existing values unless the PDF clearly shows they are wrong.',
    'Only output strict JSON in the exact schema.',
    '',
    `Existing extracted markers: ${existingJson}`,
    '',
    'Target markers:',
    'glucose, hba1c, totalCholesterol, ldl, hdl, triglycerides, tsh, vitaminD, vitaminB12, ferritin, iron, alt, ast, albumin, creatinine, uricAcid, fastingInsulin, apoB, hsCRP',
  ].join('\n');
}

function parseModelOutputToMarkers(modelText: string): BloodMarkers | null {
  const parsed = parseExtractionJson(modelText);
  if (!parsed) return null;
  return extractMarkersFromParsed(parsed);
}

function parseOrRepairModelOutputToMarkers(
  modelText: string,
  client: GoogleGenerativeAI,
  model: string,
): Promise<BloodMarkers | null> {
  return (async () => {
    const parsedDirect = parseModelOutputToMarkers(modelText);
    if (parsedDirect) return normalizeExtractedMarkers(parsedDirect);

    const repaired = await repairJsonWithGemini(client, modelText, model);
    if (!repaired) return null;
    return normalizeExtractedMarkers(extractMarkersFromParsed(repaired));
  })();
}

function parseExtractionJsonLegacy(modelText: string): unknown | null {
  try {
    return JSON.parse(modelText);
  } catch {
    const jsonStart = modelText.indexOf('{');
    const jsonEnd = modelText.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        return JSON.parse(modelText.slice(jsonStart, jsonEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGeminiForExtraction(apiKey: string, reportText: string) {
  const model = process.env.GEMINI_EXTRACTION_MODEL?.trim() || process.env.GEMINI_MODEL?.trim();
  if (!model) {
    return {
      ok: false as const,
      error: 'Gemini extraction model is not configured (set GEMINI_EXTRACTION_MODEL or GEMINI_MODEL)',
      model: 'unconfigured',
    };
  }
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const geminiModel = client.getGenerativeModel({
      model,
      systemInstruction: buildSystemPrompt(),
    });

    const response = await geminiModel.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: [
            'Extract blood marker values from this lab report text.',
            'Remember: ONLY include markers that were actually tested. Return null for any marker not present in the report.',
            '',
            '--- LAB REPORT TEXT ---',
            reportText,
            '--- END ---',
          ].join('\n'),
        }],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const modelText = response.response.text();
    if (!modelText) {
      return {
        ok: false as const,
        error: `No extraction output from model (${model})`,
        model,
      };
    }

    const markers = await parseOrRepairModelOutputToMarkers(modelText, client, model);
    if (!markers) {
      return {
        ok: false as const,
        error: `Model returned invalid JSON (${model})`,
        model,
      };
    }
    return {
      ok: true as const,
      markers,
      model,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: `Gemini extraction failed (${model}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      model,
    };
  }
}

async function callGeminiForPdfExtraction(apiKey: string, pdfBytes: Buffer) {
  const primaryModel =
    process.env.GEMINI_PDF_EXTRACTION_MODEL?.trim()
    || process.env.GEMINI_EXTRACTION_MODEL?.trim()
    || process.env.GEMINI_MODEL?.trim();
  const fallbackModel = process.env.GEMINI_PDF_EXTRACTION_FALLBACK_MODEL?.trim() || process.env.GEMINI_FALLBACK_MODEL?.trim();
  const modelsToTry = [primaryModel, fallbackModel].filter((m): m is string => Boolean(m && m.trim()));
  if (modelsToTry.length === 0) {
    return {
      ok: false as const,
      error: 'Gemini PDF extraction model is not configured (set GEMINI_PDF_EXTRACTION_MODEL or GEMINI_MODEL)',
      model: 'unconfigured',
    };
  }

  let lastError = 'Unknown error';
  for (const model of modelsToTry) {
    try {
      const client = new GoogleGenerativeAI(apiKey);
      const geminiModel = client.getGenerativeModel({
        model,
        systemInstruction: buildSystemPrompt(),
      });

      const response = await geminiModel.generateContent({
        contents: [{
          role: 'user',
          parts: [
            {
              text: [
                'Extract blood marker values from this lab report PDF.',
                'Remember: ONLY include markers that were actually tested. Return null for any marker not present in the report.',
              ].join('\n'),
            },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBytes.toString('base64'),
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      });

      const modelText = response.response.text();
      if (!modelText) {
        lastError = `No extraction output from model (${model})`;
        continue;
      }

      let markers = await parseOrRepairModelOutputToMarkers(modelText, client, model);
      if (!markers) {
        lastError = `Model returned invalid JSON (${model})`;
        continue;
      }

    // If scan quality is poor, first pass may return only 1-2 obvious markers.
    // Run one completeness audit pass and merge any additional grounded values.
      if (Object.keys(markers).length < 4) {
        const retry = await geminiModel.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: buildPdfCompletenessPrompt(markers) },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: pdfBytes.toString('base64'),
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        });
        const retryText = retry.response.text();
        if (retryText) {
          const retryMarkers = await parseOrRepairModelOutputToMarkers(retryText, client, model);
          if (retryMarkers && Object.keys(retryMarkers).length > 0) {
            markers = mergeMissingMarkers(markers, retryMarkers);
          }
        }
      }

      return {
        ok: true as const,
        markers,
        model,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  return {
    ok: false as const,
    error: `Gemini PDF extraction failed (${modelsToTry.join(' -> ')}): ${lastError}`,
    model: modelsToTry.join('|'),
  };
}

async function callDeepSeekForExtraction(apiKey: string, reportText: string) {
  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = process.env.LLM_MODEL || DEFAULT_DEEPSEEK_MODEL;
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
      error: `DeepSeek extraction failed (${model}): ${errText.slice(0, 250)}`,
      model,
    };
  }

  const payload = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const modelText = payload.choices?.[0]?.message?.content;
  if (!modelText) {
    return {
      ok: false as const,
      error: `No extraction output from model (${model})`,
      model,
    };
  }

  const parsed = parseExtractionJson(modelText);
  if (!parsed) {
    return {
      ok: false as const,
      error: `Model returned invalid JSON (${model})`,
      model,
    };
  }

  // Handle both { markers: {...} } and flat { glucose: ..., ldl: ... } shapes
  const rawMarkers =
    (parsed as { markers?: unknown }).markers ?? parsed;
  const markers = sanitizeBloodMarkers(rawMarkers);

  return {
    ok: true as const,
    markers,
    model,
  };
}

export async function POST(request: Request) {
  try {
    // Rate limit: 10 extractions per minute per IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`extract:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) },
        },
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || '';
    const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    const deepSeekIsLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    const apiKey = process.env.DEEPSEEK_API_KEY || '';

    if (!geminiApiKey && !deepSeekIsLocal && !apiKey) {
      return NextResponse.json(
        { error: 'No extraction model key configured (set GEMINI_API_KEY or DEEPSEEK_API_KEY)' },
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

    // Reject files larger than 10 MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10 MB.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    const extractionErrors: string[] = [];

    // Step 1: Extract raw text from PDF or image
    let text: string;

    if (isPdf) {
      try {
        const pdfData = await pdfParse(bytes);
        text = pdfData.text?.trim() ?? '';
      } catch (error) {
        console.warn('[extract-blood-report] pdf-parse failed, trying pdfjs fallback:', error);
        text = '';
      }
      if (!text) {
        text = await extractPdfTextWithPdfJs(bytes);
      }

      // If text extraction fails for scanned/complex PDFs, ask Gemini directly on the PDF bytes.
      if (!text && geminiApiKey) {
        const directPdfResult = await callGeminiForPdfExtraction(geminiApiKey, bytes);
        if (directPdfResult.ok && Object.keys(directPdfResult.markers).length > 0) {
          return NextResponse.json({
            markers: directPdfResult.markers,
            modelUsed: `${directPdfResult.model} (direct-pdf)`,
          });
        }
        if (!directPdfResult.ok) {
          extractionErrors.push(directPdfResult.error);
        }
      }
    } else {
      // Image OCR via Tesseract.js
      const { data } = await Tesseract.recognize(bytes, 'eng');
      text = data.text?.trim() ?? '';
    }

    if (!text) {
      return NextResponse.json(
        {
          error: isPdf ? 'Could not read text from PDF' : 'Could not extract text from image (OCR returned no text)',
          details: extractionErrors,
        },
        { status: 400 },
      );
    }

    // Step 2: Send text to LLM for structured extraction

    let workingMarkers: BloodMarkers | null = null;
    let modelUsed: string | null = null;

    // Primary: Gemini 3.1 Flash Lite
    if (geminiApiKey) {
      const geminiResult = await callGeminiForExtraction(geminiApiKey, text);
      if (geminiResult.ok && Object.keys(geminiResult.markers).length > 0) {
        workingMarkers = geminiResult.markers;
        modelUsed = geminiResult.model;
      }
      if (!geminiResult.ok) {
        extractionErrors.push(geminiResult.error);
      }
    } else {
      extractionErrors.push('Gemini extraction skipped: GEMINI_API_KEY is not configured');
    }

    // Fallback: DeepSeek (or local OpenAI-compatible endpoint)
    if (deepSeekIsLocal || apiKey) {
      const deepSeekResult = await callDeepSeekForExtraction(apiKey, text);
      if (deepSeekResult.ok && Object.keys(deepSeekResult.markers).length > 0) {
        if (workingMarkers) {
          workingMarkers = mergeMissingMarkers(workingMarkers, deepSeekResult.markers);
          modelUsed = `${modelUsed}+${deepSeekResult.model}`;
        } else {
          workingMarkers = deepSeekResult.markers;
          modelUsed = deepSeekResult.model;
        }
      }
      if (!deepSeekResult.ok) {
        extractionErrors.push(deepSeekResult.error);
      }
    } else {
      extractionErrors.push('DeepSeek extraction skipped: DEEPSEEK_API_KEY is not configured');
    }

    // Merge in any additional missing markers from local parser.
    const fallbackMarkers = sanitizeBloodMarkers(parseBloodReport(text));
    if (workingMarkers && hasMarkers(fallbackMarkers)) {
      workingMarkers = mergeMissingMarkers(workingMarkers, fallbackMarkers);
      modelUsed = `${modelUsed}+local-fallback-parser`;
    }

    if (workingMarkers && hasMarkers(workingMarkers)) {
      return NextResponse.json({
        markers: workingMarkers,
        modelUsed: modelUsed ?? 'gemini',
        warning: extractionErrors.length > 0 ? extractionErrors.join(' | ') : undefined,
      });
    }

    // Final fallback: local regex parser if LLMs fail or return empty
    if (Object.keys(fallbackMarkers).length > 0) {
      return NextResponse.json({
        markers: fallbackMarkers,
        modelUsed: 'local-fallback-parser',
        warning: extractionErrors.length > 0
          ? `${extractionErrors.join(' | ')}. Used local parser fallback.`
          : 'LLM extraction returned no results. Used local parser fallback.',
      });
    }

    return NextResponse.json(
      {
        error: 'No blood markers could be extracted from this report',
        details: extractionErrors,
      },
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
