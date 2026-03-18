# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BloodWise is a Next.js 16 health calculator app (TypeScript, React 18, Tailwind CSS) that computes TDEE (Total Daily Energy Expenditure) via the Mifflin-St Jeor equation and analyzes blood report data to generate health scores and personalized insights. Deployed as a static export on Vercel.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (static export to `dist/`)
- `npm run lint` — ESLint (`eslint . --ext .js,.jsx,.ts,.tsx`)
- `npm start` — start production server

No test framework is configured.

## Architecture

**App flow:** Three-step client-side wizard managed by React state in `app/page.tsx`:
1. **Profile form** (`components/TDEEForm.tsx`) — collects age, gender, weight, height, activity level, goal via react-hook-form
2. **Blood report** — either file upload with simulated OCR (`components/BloodReportUploader.tsx`) or manual entry (`components/BloodValuesForm.tsx`)
3. **Results** — TDEE display (`components/TDEEResultCard.tsx`), health scores (`components/HealthScoreCard.tsx`), blood markers table (`components/BloodMarkersTable.tsx`), insights (`components/InsightsList.tsx`)

**Business logic** lives in `lib/`:
- `calculations.ts` — TDEE/BMR math, health scoring (4 categories, 0-100 scale), insight generation
- `bloodParser.ts` — regex-based blood marker extraction from text, reference ranges

**Types** in `types/index.ts`: `UserProfile`, `BloodMarkers`, `TDEEResult`, `HealthScore`, `Insight`, `AnalysisResult`.

## Key Details

- **Static export**: `next.config.js` sets `output: 'export'` and `distDir: 'dist'` with unoptimized images
- **Path alias**: `@/*` maps to project root (tsconfig)
- **Custom Tailwind colors**: `primary` (green) and `blood` (red) scales in `tailwind.config.ts`
- **OCR is demo mode**: `BloodReportUploader` returns hardcoded sample data after a 2-second delay; production would use Tesseract.js or Cloud Vision API
- **No env vars required** for basic operation; optional `OPENAI_API_KEY` and `GOOGLE_CLOUD_VISION_API_KEY` documented in `.env.example`
- **CI**: GitHub Actions runs build on push to main and PRs (Node 20, no tests)
- **CodeRabbit** configured for automated PR reviews (`.coderabbit.yaml`)
