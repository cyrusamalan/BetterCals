# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BetterCals (repo name: BloodWise) is a Next.js 16 health analytics app (TypeScript, React 18, Tailwind CSS) that:
- Computes TDEE (Total Daily Energy Expenditure) via the Mifflin-St Jeor equation
- Analyzes blood report data via PDF upload (LLM extraction + regex fallback) or manual entry
- Generates personalized health scores, insights, macros, calorie tiers, and ASCVD risk
- Persists analysis history with Clerk authentication and Neon PostgreSQL (optional)

Deployed on Vercel as a server-rendered Next.js app (App Router with API routes).

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (outputs to `.next/`)
- `npm run lint` — ESLint (`eslint . --ext .js,.jsx,.ts,.tsx`)
- `npm start` — start production server
- `npx drizzle-kit generate` — generate SQL migrations from schema changes
- `npx drizzle-kit push` — push schema changes directly to the database

No test framework is configured; CI only runs the build.

## Coding Style

- 2-space indentation, semicolons, single quotes, trailing commas
- PascalCase for React components and their filenames; camelCase for utility modules
- Business logic belongs in `lib/`, not in page components
- `@/*` path alias maps to the project root (use `@/components/...`, `@/lib/...`, `@/types/...`)

## Environment Variables

Copy `.env.example` to `.env.local`. Required for full functionality:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string (analysis history) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `DEEPSEEK_API_KEY` | LLM for blood report extraction (defaults to DeepSeek cloud) |
| `LLM_BASE_URL` | Optional local LLM endpoint (Ollama, LM Studio) |
| `LLM_MODEL` | Optional local model name |

Basic profile + manual blood entry works without any env vars. Auth and history require Clerk. PDF extraction requires `DEEPSEEK_API_KEY` or `LLM_BASE_URL`.

## Repository Structure

- `app/` — Next.js App Router: pages, layouts, and API routes
  - `page.tsx` — main entry point (3-step wizard)
  - `history/` — analysis history pages
  - `api/` — server routes (`extract-blood-report/`, `analyses/`, `profile/`)
- `components/` — React components (wizard steps, logo marks, `dashboard/` sub-components)
- `lib/` — core business logic (`calculations.ts`, `bloodParser.ts`, `riskModels.ts`, `markerMetadata.ts`, `averageMarkers.ts`, `db/`)
- `types/index.ts` — all shared TypeScript interfaces
- `proxy.ts` — Clerk middleware (protects API routes)
- `drizzle/` — auto-generated SQL migrations

## Architecture & Data Flow

### 3-Step Wizard (app/page.tsx)

State is managed with `useState`/`useEffect` in `app/page.tsx` and persisted to `localStorage`.

```
Step 1: Profile (TDEEForm)
  → UserProfile { age, gender, race, weight(lbs), height(ft+in), activityLevel, goal,
                  optional: smoker, diabetic, systolicBP, waistInches, hipInches }

Step 2: Blood data (BloodReportUploader OR BloodValuesForm)
  → BloodMarkers { glucose?, hba1c?, totalCholesterol?, ldl?, hdl?, triglycerides?,
                   tsh?, vitaminD?, vitaminB12?, ferritin?, iron?, alt?, ast?,
                   albumin?, creatinine?, uricAcid?, insulin?, testosterone?,
                   cortisol?, homocysteine? }
  → Falls back to estimateAverageMarkers(gender, age) if no data provided

Step 3: Results (BloodTestDashboard)
  → Runs full calculation pipeline → AnalysisResult
  → Optional: save to DB if user is authenticated
```

### Business Logic Pipeline (lib/calculations.ts)

```
UserProfile + BloodMarkers
  → calculateTDEE(profile)          → TDEEResult { bmr, tdee, targetCalories, activityMultiplier }
  → calculateHealthScore(markers)   → HealthScore { overall, metabolic, cardiovascular,
                                                    hormonal, nutritional, hepatic, renal }
  → generateInsights(...)           → Insight[]
  → identifyDeficiencies(markers)   → string[]
  → identifyRisks(markers)          → string[]
  → calculateCalorieTiers(tdee)     → CalorieTier[] (6 tiers: -1 to +1 lb/wk)
  → calculateMacros(calories, goal) → MacroBreakdown { protein, carbs, fat }
  → calculateRecommendations(...)   → PersonalizedRecs { bmi, waterIntakeOz, ratios,
                                                         supplements[], exerciseSuggestions[] }
  → calculateASCVDRiskScore(...)     → number | null (ages 40-79 only)
```

### PDF Extraction Pipeline (app/api/extract-blood-report/route.ts)

```
POST /api/extract-blood-report
  → pdfParse(buffer) → raw text
  → callLLMForExtraction(text)  → JSON markers   [primary: DeepSeek/LLM]
  → fallback: parseBloodReport(text)             [regex from lib/bloodParser.ts]
  → sanitizeBloodMarkers(markers) → validated BloodMarkers
```

### Analysis History (app/api/analyses/)

Protected by Clerk middleware in `proxy.ts`. Requires authenticated user.

```
GET  /api/profile        → fetch user's saved profile
GET  /api/analyses       → list user's saved analyses (newest first)
POST /api/analyses       → save { profile, markers, result } as JSONB
GET  /api/analyses/[id]  → fetch single analysis (ownership check)
DELETE /api/analyses/[id] → delete (ownership check)
```

## Key Calculations

All formulas are in `lib/calculations.ts` unless noted. See the source for exact equations and constants.

- **TDEE** — Mifflin-St Jeor equation with 5 activity multipliers; goal-adjusted target calories (lose/maintain/gain)
- **Health Score** — 0–100 per category (metabolic, cardiovascular, hormonal, nutritional, hepatic, renal); each marker maps to a `MarkerStatus` via tiers in `lib/bloodParser.ts`; overall = average of non-zero categories
- **Macros** — goal-specific protein/carbs/fat percentage splits
- **Calorie Tiers** — 6 tiers from TDEE (−750 to +500 cal/day, 1200 kcal floor)
- **ASCVD Risk** — ACC/AHA 2013 Pooled Cohort Equations in `lib/riskModels.ts`; race/sex-specific; ages 40–79 only

## TypeScript Types (types/index.ts)

All shared interfaces live here. Key types:
- `UserProfile` — form inputs including optional cardiovascular risk factors
- `BloodMarkers` — 20 optional blood test values (all `number | undefined`)
- `MarkerStatus` — `'low' | 'optimal' | 'normal' | 'borderline' | 'high' | 'critical' | 'unknown'`
- `TDEEResult`, `HealthScore`, `Insight`, `CalorieTier`, `MacroBreakdown`, `PersonalizedRecs`
- `AnalysisResult` — the full output containing all computed data
- `AnalysisHistory` — DB record shape (includes id, createdAt, profile, markers, result)

## UI Conventions

- **Styling**: Tailwind CSS with custom `primary` (green) and `blood` (red) scales
- **Fonts**: DM Serif Display (headings/display), DM Sans (body) via Google Fonts
- **Charts**: Recharts (radar, donut, bar) — all rendered client-side
- **Glass cards**: `backdrop-blur`, `border`, soft shadows — consistent card style
- **CSS variables**: `--accent`, `--text-primary`, etc. for theming overrides
- **Icons**: `lucide-react`
- **Form validation**: `react-hook-form` with inline error messages
- **Responsive**: Tailwind grid layouts, mobile-first

## Authentication (Clerk)

- `ClerkProvider` wraps the app in `app/layout.tsx`
- `proxy.ts` (middleware) protects `/api/analyses/*` and `/api/profile/*` — requires valid session
- `useAuth()` hook used in components to conditionally show save/history features
- Public routes: `/`, `/sign-in`, `/sign-up`

## Database (Neon + Drizzle)

- `lib/db/schema.ts` — `analyses` table (JSONB columns for `profile`, `markers`, `result`) and `profiles` table (`userId` unique, `profile` JSONB, `updatedAt`)
- `lib/db/index.ts` — singleton `db` factory using `@neondatabase/serverless`
- `drizzle.config.ts` — points to `DATABASE_URL` env var
- Used for analysis history and persistent user profiles; all calculations are client-side

## Development Notes

- **OCR in production**: `BloodReportUploader` calls `/api/extract-blood-report` which uses LLM (DeepSeek default) for extraction; `lib/bloodParser.ts` provides a regex fallback. The old demo hardcoded data has been replaced.
- **No test framework**: CI only runs `npm run build`. Validate changes manually with `npm run dev`.
- **Deployment**: Server-rendered on Vercel (not static export). `vercel.json` points to `.next/` output. API routes, Clerk auth, and Neon DB require server-side rendering.
- **Unit convention**: User inputs imperial (lbs, ft/in); calculations use metric internally; blood markers use standard lab units (mg/dL, ng/mL, mIU/L, etc.).
- **Physiological validation**: `sanitizeBloodMarkers()` in the API route rejects implausible values; `NaN`/`Infinity` guards are applied to all optional numeric fields.
- **CodeRabbit**: Assertive auto-review runs on all PRs. Ignores `dist/`, `node_modules/`, `package-lock.json`.
- **Notable dependencies**: `tesseract.js` (client-side OCR), `pdfjs-dist` (PDF text extraction), `html2pdf.js` (report export to PDF).
- **CI**: `.github/workflows/ci.yml` — Node 20, `npm ci`, `npm run build` on push to `main` and all PRs.
