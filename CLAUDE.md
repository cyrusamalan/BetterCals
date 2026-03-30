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

No test framework is configured; CI only runs the build.

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

```
/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # 3-step wizard (main entry point)
│   ├── layout.tsx               # Root layout: Clerk provider, fonts, metadata
│   ├── api/
│   │   ├── extract-blood-report/route.ts   # PDF/image → markers via LLM
│   │   └── analyses/
│   │       ├── route.ts         # GET (list), POST (save) analyses
│   │       └── [id]/route.ts    # GET (fetch), DELETE individual analysis
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── sign-in/sso-callback/page.tsx
│   └── sign-up/sso-callback/page.tsx
├── components/
│   ├── TDEEForm.tsx             # Step 1: profile form (react-hook-form)
│   ├── BloodReportUploader.tsx  # Step 2a: drag-drop PDF/image upload
│   ├── BloodValuesForm.tsx      # Step 2b: manual blood marker entry
│   ├── BloodTestDashboard.tsx   # Step 3: full results dashboard
│   ├── VitalsMark.tsx           # ECG-ring logo component
│   ├── BetterCalsMark.tsx       # Donut chart logo component
│   ├── AnatomySVG.tsx           # Anatomical illustration (organ highlights)
│   └── dashboard/               # Dashboard sub-components
│       ├── HealthRadarChart.tsx        # 6-axis Recharts radar
│       ├── MacroDonutChart.tsx         # P/C/F donut chart
│       ├── CalorieTiersCard.tsx        # Table of 6 calorie goal tiers
│       ├── ASCVDRiskCard.tsx           # 10-year ASCVD risk display
│       ├── MarkerComparisonChart.tsx   # Bar chart: user vs reference ranges
│       └── RecommendationsPanel.tsx   # BMI, water, ratios, supplements, exercise
├── lib/
│   ├── calculations.ts          # All core business logic (TDEE, scores, insights)
│   ├── bloodParser.ts           # Marker rules, reference ranges, regex parser
│   ├── riskModels.ts            # ACC/AHA 2013 ASCVD Pooled Cohort Equations
│   ├── averageMarkers.ts        # Population medians by gender/age (fallback)
│   └── db/
│       ├── schema.ts            # Drizzle ORM: analyses table (JSONB)
│       └── index.ts             # Neon DB singleton factory
├── types/
│   └── index.ts                 # All shared TypeScript interfaces
├── proxy.ts                     # Clerk middleware (protects /api/analyses/*)
├── drizzle.config.ts            # Drizzle ORM config
├── next.config.js               # Next.js config (unoptimized images)
├── tailwind.config.ts           # Custom colors: primary (green), blood (red)
├── tsconfig.json                # Strict TS, @/* path alias → project root
├── vercel.json                  # Vercel deployment config
├── .coderabbit.yaml             # CodeRabbit PR review (assertive profile)
└── .github/workflows/ci.yml    # Build on push to main + PRs (Node 20)
```

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
GET  /api/analyses       → list user's saved analyses (newest first)
POST /api/analyses       → save { profile, markers, result } as JSONB
GET  /api/analyses/[id]  → fetch single analysis (ownership check)
DELETE /api/analyses/[id] → delete (ownership check)
```

## Key Calculations

### TDEE (Mifflin-St Jeor)
```
BMR (male)   = 10×weight_kg + 6.25×height_cm − 5×age + 5
BMR (female) = 10×weight_kg + 6.25×height_cm − 5×age − 161

Activity multipliers: sedentary=1.2, light=1.375, moderate=1.55, active=1.725, very-active=1.9

TDEE = round(BMR × multiplier)
targetCalories = TDEE × { lose: 0.8, maintain: 1.0, gain: 1.1 }
```

### Health Score (0–100 per category)
Each blood marker maps to a `MarkerStatus` → numeric score (0–100) via tiers in `lib/bloodParser.ts`. Category score = average of its markers. Overall = average of non-zero categories.

| Category | Markers |
|---|---|
| metabolic | glucose, hba1c, fastingInsulin |
| cardiovascular | totalCholesterol, ldl, hdl, triglycerides, nonHdl, apoB, hsCRP |
| hormonal | tsh |
| nutritional | vitaminD, vitaminB12, ferritin, iron |
| hepatic | alt, ast, albumin |
| renal | creatinine, uricAcid |

### Macros by Goal
| Goal | Protein | Carbs | Fat |
|---|---|---|---|
| lose | 40% | 30% | 30% |
| maintain | 30% | 40% | 30% |
| gain | 35% | 40% | 25% |

### Calorie Tiers
6 tiers from base TDEE: −750, −500, −250, 0, +250, +500 cal/day (min 1200 kcal floor applied to deficit tiers).

### ASCVD Risk (ACC/AHA 2013 Pooled Cohort Equations)
Race/sex-specific coefficients from `lib/riskModels.ts`. Inputs: age (40–79), sex, race (white/black), TC, HDL-C, SBP, smoker, diabetic. Returns 10-year risk %.

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

## Path Alias

`@/*` maps to the project root. Use `@/components/...`, `@/lib/...`, `@/types/...` etc.

## Authentication (Clerk)

- `ClerkProvider` wraps the app in `app/layout.tsx`
- `proxy.ts` (middleware) protects `/api/analyses/*` — requires valid session
- `useAuth()` hook used in components to conditionally show save/history features
- Public routes: `/`, `/sign-in`, `/sign-up`

## Database (Neon + Drizzle)

- `lib/db/schema.ts` — single `analyses` table with JSONB columns for `profile`, `markers`, `result`
- `lib/db/index.ts` — singleton `db` factory using `@neondatabase/serverless`
- `drizzle.config.ts` — points to `DATABASE_URL` env var
- Only used for analysis history; all calculations are client-side

## Development Notes

- **OCR in production**: `BloodReportUploader` calls `/api/extract-blood-report` which uses LLM (DeepSeek default) for extraction; `lib/bloodParser.ts` provides a regex fallback. The old demo hardcoded data has been replaced.
- **No test framework**: CI only runs `npm run build`. Validate changes manually with `npm run dev`.
- **Deployment**: Server-rendered on Vercel (not static export). `vercel.json` points to `.next/` output. API routes, Clerk auth, and Neon DB require server-side rendering.
- **Unit convention**: User inputs imperial (lbs, ft/in); calculations use metric internally; blood markers use standard lab units (mg/dL, ng/mL, mIU/L, etc.).
- **Physiological validation**: `sanitizeBloodMarkers()` in the API route rejects implausible values; `NaN`/`Infinity` guards are applied to all optional numeric fields.
- **CodeRabbit**: Assertive auto-review runs on all PRs. Ignores `dist/`, `node_modules/`, `package-lock.json`.
- **CI**: `.github/workflows/ci.yml` — Node 20, `npm ci`, `npm run build` on push to `main` and all PRs.
