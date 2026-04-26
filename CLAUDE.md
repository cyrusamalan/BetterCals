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
- `npm run lint` — ESLint (ignores `dist/`, `.next/`, `out/`)
- `npm test` — run Vitest suite once
- `npm run test:watch` — Vitest in watch mode
- `npm start` — start production server
- `npx drizzle-kit generate` — generate SQL migrations from schema changes
- `npx drizzle-kit push` — push schema changes directly to the database

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
  - `page.tsx` — marketing landing page (hero, features, CTAs)
  - `analyze/page.tsx` — main analysis workflow (3-step wizard)
  - `history/page.tsx` — trends dashboard with marker forecasts
  - `history/[id]/page.tsx` — single past analysis detail view
  - `api/` — server routes (`extract-blood-report/`, `analyses/`, `profile/`)
- `components/` — React components (wizard steps, logo marks, `dashboard/` sub-components)
  - `dashboard/` — result cards: `ActionPlanCard`, `ASCVDRiskCard`, `PopulationBenchmarksCard`, `MarkerEducationDrawer`, `CalorieTiersCard`, `MacroDonutChart`, `HealthRadarChart`, `RecommendationsPanel`, etc.
- `lib/` — core business logic
  - `calculations.ts` — TDEE, macros, health scores, insights, recommendations
  - `bloodParser.ts` — marker reference ranges, status tiers, regex fallback parser
  - `riskModels.ts` — ACC/AHA 2013 Pooled Cohort Equations (ASCVD)
  - `derivedInsights.ts` — action plans, population benchmarks, marker forecasts (linear regression)
  - `markerMetadata.ts` — marker labels, units, hints, optimal ranges (used by forms + education drawer)
  - `averageMarkers.ts` — population median markers by gender × age band
  - `profileUtils.ts` — legacy profile migration (string focusGoal → array)
  - `ai/dietPlan.ts` — LLM-driven personalized diet plan generator (reuses `DEEPSEEK_API_KEY` / `LLM_BASE_URL`); validates output and falls back to a deterministic balanced split if the LLM is unavailable or returns invalid JSON
  - `db/` — Neon database singleton + Drizzle schema
- `types/index.ts` — all shared TypeScript interfaces
- `proxy.ts` — Clerk middleware (protects API routes)
- `drizzle/` — auto-generated SQL migrations

## Architecture & Data Flow

### 3-Step Wizard (app/analyze/page.tsx)

State is managed with `useState`/`useEffect` in `app/analyze/page.tsx` and persisted to `localStorage`.

```
Step 1: Profile (TDEEForm)
  → UserProfile { age, gender, race, weight(lbs), height(ft+in), activityLevel, goal,
                  focusGoal[] (multi-select), advancedActivity mode (steps, occupation,
                  exercise sessions), lifestyle (sleep, stress, dietary pattern),
                  CV risk factors (smoker, diabetic, BP, family history, HRT, CKD),
                  body composition (waist, hip, bodyFatPercentage), medications }

Step 2: Blood data (BloodReportUploader OR BloodValuesForm)
  → BloodMarkers { glucose?, hba1c?, totalCholesterol?, ldl?, hdl?, triglycerides?,
                   apoB?, hsCRP?, tsh?, vitaminD?, vitaminB12?, ferritin?, iron?,
                   alt?, ast?, albumin?, creatinine?, uricAcid?, fastingInsulin? }
  → Falls back to population medians by gender × age band if no data provided

Step 3: Results (BloodTestDashboard)
  → Runs full calculation pipeline → AnalysisResult
  → Optional: save to DB if user is authenticated
```

### Business Logic Pipeline (lib/calculations.ts)

```
UserProfile + BloodMarkers
  → calculateTDEE(profile)            → TDEEResult { bmr, tdee, targetCalories, activityMultiplier,
                                                      neatCalories?, exerciseCalories? }
                                         Mifflin-St Jeor (default) or Katch-McArdle (if body fat %)
                                         Simple mode: BMR × multiplier
                                         Advanced mode: BMR + NEAT (steps + occupation) + exercise (MET-based)
  → calculateHealthScore(markers, profile) → HealthScore { overall, metabolic, cardiovascular,
                                                            hormonal, nutritional, hepatic, renal }
  → generateInsights(...)              → Insight[] (~50 rules)
  → identifyDeficiencies(markers)      → string[]
  → identifyRisks(markers)             → string[]
  → calculateCalorieTiers(tdee)        → CalorieTier[] (3 tiers: deficit, maintain, surplus)
  → calculateMacros(profile, tdee, markers) → MacroBreakdown { protein, carbs, fat }
                                         Focus-goal-aware: protein 0.75–1.0g/lb, recomp mode if both fat-loss + muscle-gain
  → calculateRecommendations(...)      → PersonalizedRecs { bmi, waterIntakeOz, ratios (HOMA-IR, TyG,
                                                             waist-to-hip, LDL/HDL, TG/HDL),
                                                             supplements[], exerciseSuggestions[], mealTiming }
  → deriveMarkers(markers)             → { ldl?, nonHdl? } (Friedewald equation)
  → deriveActionPlan(profile, markers) → ActionPlanItem[] (top 3 priorities) [lib/derivedInsights.ts]
  → calculateASCVDRiskScore(...)       → number | null (ages 40-79 only)
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
POST /api/diet-plan      → on-demand personalized diet plan; rate-limited; if {analysisId} is provided and the requester owns it, the plan is merged into analyses.result.dietPlan (JSONB)
GET  /api/adherence      → daily checklist history (optional ?from=&to=YYYY-MM-DD&limit=)
PUT  /api/adherence      → upsert today's checklist row { date, checks, totalCount }; unique on (userId, eventDate)
```

## Key Calculations

All formulas are in `lib/calculations.ts` unless noted. See the source for exact equations and constants.

- **TDEE** — Mifflin-St Jeor (default) or Katch-McArdle (if body fat %); simple mode uses 5 activity multipliers; advanced mode sums BMR + NEAT (steps + occupation) + exercise (MET-based); goal adjustment 0.7× (aggressive cut) to 1.2× (aggressive bulk)
- **Health Score** — 0–100 per category (metabolic, cardiovascular, hormonal, nutritional, hepatic, renal); each marker maps to a `MarkerStatus` via tiers in `lib/bloodParser.ts`; overall = average of non-zero categories
- **Macros** — focus-goal-aware splits; protein 0.75–1.0g/lb (highest for fat-loss); recomp mode when both fat-loss + muscle-gain selected
- **Calorie Tiers** — 3 tiers (deficit, maintain, surplus) from TDEE, 1200 kcal floor
- **ASCVD Risk** — ACC/AHA 2013 Pooled Cohort Equations in `lib/riskModels.ts`; 4 race×sex coefficient sets (white/black × male/female); ages 40–79 only
- **Derived Markers** — LDL via Friedewald equation (TC − HDL − TG/5), Non-HDL (TC − HDL)
- **Action Plan** — top 3 prioritized items from marker deviations (`lib/derivedInsights.ts`)
- **Population Benchmarks** — user vs. age/gender medians from `lib/averageMarkers.ts`
- **Marker Forecasts** — linear regression on historical values for 30/90-day projections (`lib/derivedInsights.ts`)

## TypeScript Types (types/index.ts)

All shared interfaces live here. Key types:
- `UserProfile` — demographics, activity (simple or advanced), goal + focusGoal[] (multi-select), CV risk factors, body composition, lifestyle context, medications
- `BloodMarkers` — 20 optional blood test values (all `number | undefined`); includes apoB, hsCRP, fastingInsulin
- `MarkerStatus` — `'low' | 'optimal' | 'normal' | 'borderline' | 'high' | 'critical' | 'unknown'`
- `TDEEResult`, `HealthScore`, `Insight`, `CalorieTier`, `MacroBreakdown`, `PersonalizedRecs`
- `AnalysisResult` — the full output containing all computed data (includes `derivedMarkers`, `ascvdRiskScore`, `actionPlan`, `usedAverageMarkers`)
- `AnalysisHistory` — DB record shape (includes id, createdAt, profile, markers, result)
- `ActionPlanItem`, `PopulationBenchmark`, `MarkerForecast` — derived insight types
- `ExerciseSession`, `ExerciseTemplate`, `FocusGoal`, `DietaryPattern` — profile sub-types

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
- Public routes: `/`, `/analyze`, `/sign-in`, `/sign-up`

## Database (Neon + Drizzle)

- `lib/db/schema.ts` — `analyses` table (JSONB columns for `profile`, `markers`, `result`) and `profiles` table (`userId` unique, `profile` JSONB, `updatedAt`)
- `lib/db/index.ts` — singleton `db` factory using `@neondatabase/serverless`
- `drizzle.config.ts` — points to `DATABASE_URL` env var
- Used for analysis history and persistent user profiles; all calculations are client-side

## Development Notes

- **OCR in production**: `BloodReportUploader` calls `/api/extract-blood-report` which uses LLM (DeepSeek default) for extraction; `lib/bloodParser.ts` provides a regex fallback. The old demo hardcoded data has been replaced.
- **Tests**: Vitest suite in `__tests__/` covers `calculations`, `bloodParser`, `riskModels`, `rateLimit`, and `schemas`. Run with `npm test`. CI currently only runs `npm run build` — run tests locally before pushing.
- **Deployment**: Server-rendered on Vercel (not static export). `vercel.json` points to `.next/` output. API routes, Clerk auth, and Neon DB require server-side rendering.
- **Unit convention**: User inputs imperial (lbs, ft/in); calculations use metric internally; blood markers use standard lab units (mg/dL, ng/mL, mIU/L, etc.).
- **Physiological validation**: `sanitizeBloodMarkers()` in the API route rejects implausible values; `NaN`/`Infinity` guards are applied to all optional numeric fields.
- **CodeRabbit**: Assertive auto-review runs on all PRs. Ignores `dist/`, `node_modules/`, `package-lock.json`.
- **Notable dependencies**: `tesseract.js` (client-side OCR), `pdfjs-dist` (PDF text extraction), `html2pdf.js` (report export to PDF).
- **CI**: `.github/workflows/ci.yml` — Node 20, `npm ci`, `npm run build` on push to `main` and all PRs.
