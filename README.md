# BetterCals — Smart Calorie & Health Calculator

BetterCals is a **Next.js (App Router) + TypeScript** app that:
- Calculates **BMR/TDEE** from a user profile (Mifflin–St Jeor)
- Lets users upload or manually enter common blood markers
- Produces a simple **health score** (0–100) across 4 categories
- Generates basic **recommendations** (calorie tiers, macros, hydration, LDL/HDL ratio, etc.)

This README explains the app flow and the **calculation logic at a high level**.

## App flow (high level)

The UI is a 3-step wizard in `app/page.tsx`:
- **Profile** → collects age, sex, height, weight, activity level, and goal
- **Blood report** → upload (demo OCR) or manual entry
- **Results** → dashboard view in `components/BloodTestDashboard.tsx`

Business logic lives in:
- `lib/calculations.ts` (TDEE, BMI, scores, insights, macros, tiers)
- `lib/bloodParser.ts` (reference ranges + parsing + status)
- `lib/averageMarkers.ts` (estimated “typical” markers when report is blank)

## Core calculations

### Units
Profile input is imperial:
- Weight: **lbs**
- Height: **feet + inches**

Conversions:
- \(kg = lbs \times 0.453592\)
- \(cm = (feet \times 12 + inches) \times 2.54\)

### BMR (Mifflin–St Jeor)
Implemented in `calculateTDEE()` in `lib/calculations.ts`.

For **male**:
\[
BMR = 10w + 6.25h - 5a + 5
\]

For **female**:
\[
BMR = 10w + 6.25h - 5a - 161
\]

Where:
- \(w\) = weight in kg
- \(h\) = height in cm
- \(a\) = age in years

### Activity multipliers → TDEE
TDEE is:
\[
TDEE = round(BMR \times activityMultiplier)
\]

Multipliers (from `ACTIVITY_MULTIPLIERS`):
- sedentary: **1.2**
- light: **1.375**
- moderate: **1.55**
- active: **1.725**
- very-active: **1.9**

### Target calories (goal adjustment)
`calculateTDEE()` also returns `targetCalories`:
- **Lose**: `round(TDEE * 0.8)` (20% deficit)
- **Maintain**: `TDEE`
- **Gain**: `round(TDEE * 1.1)` (10% surplus)

### Calorie goal tiers (fixed deltas)
The results page also shows tiers computed from `tdee` (not `targetCalories`) via `calculateCalorieTiers()`:
- Lose 1.5 lb/wk: **TDEE − 750**
- Lose 1 lb/wk: **TDEE − 500**
- Lose 0.5 lb/wk: **TDEE − 250**
- Maintain: **TDEE**
- Gain 0.5 lb/wk: **TDEE + 250**
- Gain 1 lb/wk: **TDEE + 500**

With a safety floor for loss tiers:
- minimum **1200 kcal/day**

### Macros (P/C/F split)
`calculateMacros(calories, goal)` returns grams + percent:
- **Maintain**: 30% protein / 40% carbs / 30% fat
- **Lose**: 40% protein / 30% carbs / 30% fat
- **Gain**: 35% protein / 40% carbs / 25% fat

Conversion:
- Protein, carbs: 4 kcal/g
- Fat: 9 kcal/g

### BMI
BMI is computed from imperial units in `calculateBMI()`:
\[
BMI = \frac{lbs \times 703}{in^2}
\]

Categories:
- <18.5 Underweight
- <25 Normal
- <30 Overweight
- ≥30 Obese

## Blood markers

### Supported markers
BetterCals supports these markers (manual entry and regex parsing):
- Glucose, HbA1c
- Total Cholesterol, LDL, HDL, Triglycerides
- TSH
- Vitamin D, Vitamin B12
- Ferritin, Serum Iron

### Reference ranges + status
Defined in `lib/bloodParser.ts` as `REFERENCE_RANGES`.

`getMarkerStatus(marker, value)` maps a value to:
- `normal`
- `low`
- `high`
- `critical`

Rule of thumb:
- outside range → low/high
- far outside range (below 70% of min or above 150% of max) → critical

Special-case:
- **HDL** is treated as “higher is better”, so only *low HDL* is flagged.

### When the report is blank (estimated markers)
If a user submits without any blood markers:
- The app generates a set of **estimated “typical” markers** from `lib/averageMarkers.ts` using:
  - sex
  - age band
  - BMI (from weight/height)
- The results page explicitly labels these as estimates and suppresses risks/deficiencies/marker insights.

This keeps the experience smooth while avoiding the impression that estimated values are the user’s real labs.

## Health score (0–100)

`calculateHealthScore()` produces 4 category scores and an overall average:
\[
overall = round\left(\frac{metabolic + cardiovascular + hormonal + nutritional}{4}\right)
\]

Each category uses a **baseline score** with point adjustments (simple heuristics):
- **Metabolic**: glucose + HbA1c
- **Cardiovascular**: LDL + HDL + triglycerides
- **Hormonal**: TSH
- **Nutritional**: penalizes deficiencies (Vitamin D, B12, ferritin, iron)

All scores are clamped to [0, 100].

## Recommendations (non-medical)
`calculateRecommendations()` computes:
- BMI + category
- Water intake estimate: `0.5 oz/lb + 16 oz × (activity tier above sedentary)`
- LDL/HDL ratio + interpretation bands
- Suggested supplements if deficiencies are detected
- Exercise suggestions based on activity level and some marker flags

## Running locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Note on OCR
The uploader is currently demo/simulated. A production setup would use OCR like:
- Tesseract.js (client)
- Cloud Vision (server)

## Disclaimer
BetterCals provides estimates and general education for informational purposes only.
Always consult qualified healthcare professionals for medical advice.

## License
MIT
