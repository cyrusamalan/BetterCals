# Cursor Prompt: Clinical History Expansion + Multi-Select Focus Goals

## Context

This is a Next.js 16 health analytics app (TypeScript, React 18, Tailwind CSS). The user fills out a 3-step wizard:
1. **Profile form** (`components/TDEEForm.tsx`) — collects demographics, activity, goals, lifestyle
2. **Blood markers** — PDF upload or manual entry
3. **Results dashboard** (`components/BloodTestDashboard.tsx`) — shows TDEE, macros, health scores, insights, supplements, exercise suggestions

All shared types live in `types/index.ts`. All business logic lives in `lib/calculations.ts`. All new profile fields should be **optional** for backwards compatibility — the DB stores profiles as JSONB so no migration is needed.

---

## Task 1: Expand Clinical History Section

The "Clinical History (ASCVD)" collapsible section in `components/TDEEForm.tsx` currently has:
- Race (for ASCVD risk model)
- Smoker checkbox
- Diabetic checkbox
- Systolic blood pressure
- Treated for hypertension checkbox

### Add these new inputs:

#### A. Alcohol Consumption
**Field**: `alcoholDrinksPerWeek?: number` (0–50 range)
**UI**: Number input in clinical history section, labeled "Alcohol (drinks/week)" with helper text "1 drink = 12oz beer, 5oz wine, 1.5oz spirits"

**What it changes downstream** (`lib/calculations.ts`):
- **Insights** (`generateInsights()`): If `alcoholDrinksPerWeek > 14` AND ALT or AST is elevated → add insight: "Heavy alcohol use is a likely contributor to elevated liver enzymes. Consider reducing intake before retesting." If `alcoholDrinksPerWeek > 21` AND triglycerides are borderline/high → add insight connecting alcohol to triglyceride elevation.
- **Recommendations** (`calculateRecommendations()`): If `alcoholDrinksPerWeek > 14`, add supplement "B-Complex (B1, B6, B12)" with reason "Heavy alcohol use depletes B vitamins, particularly thiamine (B1)". If `alcoholDrinksPerWeek > 7` AND uric acid is elevated → add exercise note about avoiding dehydration.
- **Marker interpretation context**: If statins + elevated ALT AND alcohol > 14 drinks/week → insight should note both as possible contributors.

#### B. Family History of Premature Heart Disease
**Field**: `familyHeartDisease?: boolean`
**UI**: Checkbox labeled "Family history of heart disease" with helper text "First-degree relative (parent/sibling) diagnosed before age 55 (male) or 65 (female)"

**What it changes downstream**:
- **Insights**: If `familyHeartDisease === true` AND any cardiovascular marker is borderline or high → elevate insight severity from `warning` to `danger` and add: "Family history of premature heart disease increases your personal risk — treat borderline cardiovascular markers more aggressively."
- **Recommendations**: If `familyHeartDisease === true` → always recommend omega-3 if not already present. Add exercise note: "Prioritize cardiorespiratory fitness (VO2max) — it is the most modifiable cardiovascular risk factor."
- **ASCVD context**: If ASCVD risk is computed AND `familyHeartDisease === true` → add a note below the risk score: "Your family history is not captured in the ACC/AHA model but meaningfully increases your true risk."

#### C. Hormone Replacement Therapy (HRT)
**Field**: `takingHRT?: boolean`
**UI**: Checkbox, shown only when `gender === 'female'`, labeled "Hormone Replacement Therapy" with helper text "Estrogen or combined HRT"

**What it changes downstream**:
- **Insights**: If `takingHRT === true` AND LDL is normal → note: "HRT may lower LDL — this is expected and not necessarily a sign of poor metabolic health." If `takingHRT === true` AND triglycerides are elevated → note: "Oral estrogen can raise triglycerides — transdermal HRT has less effect on lipids."
- **ASCVD context**: The ACC/AHA pooled cohort equations do not account for HRT. If ASCVD risk is computed and user is on HRT → add disclaimer note.

#### D. Kidney Disease / CKD
**Field**: `chronicKidneyDisease?: boolean`
**UI**: Checkbox labeled "Chronic Kidney Disease (CKD)" with helper text "Diagnosed by a physician"

**What it changes downstream**:
- **Insights**: If `chronicKidneyDisease === true` AND creatinine is elevated → change insight from generic "high creatinine" to "Creatinine is elevated, consistent with known CKD. Monitor eGFR trend rather than single values." If `chronicKidneyDisease === true` AND protein recommendations are high → add caution: "High protein intake (>1.2 g/kg) may accelerate CKD progression — discuss protein targets with your nephrologist."
- **Supplements**: If `chronicKidneyDisease === true` → add warning flag to any potassium-heavy supplement recommendation. Do not recommend high-dose magnesium without a note to check with physician.

### Type changes needed in `types/index.ts`:
```typescript
// Add to UserProfile (all optional):
alcoholDrinksPerWeek?: number;
familyHeartDisease?: boolean;
takingHRT?: boolean;           // female only
chronicKidneyDisease?: boolean;
```

### Form placement:
Add all four fields inside the existing "Clinical History (ASCVD)" collapsible section in `TDEEForm.tsx`. `takingHRT` should be conditionally rendered based on `watch('gender') === 'female'`. Keep the existing layout style (checkbox rows + number inputs using the `FieldGroup` component pattern already in the file).

---

## Task 2: Multi-Select Focus Goals

### Current behavior
`focusGoal` is typed as `FocusGoal | undefined` (single selection). The user can pick one: Fat Loss, Muscle Gain, Metabolic Health, Endurance, Longevity, General Wellness.

### Required change
Allow users to select **multiple** focus goals simultaneously. Change `focusGoal` from a single value to an array.

### Type change in `types/index.ts`:
```typescript
// Change in UserProfile:
focusGoal?: FocusGoal[];   // was: focusGoal?: FocusGoal
```

### Form change in `components/TDEEForm.tsx`:
The `FocusGoalSelector` component currently uses `value?: FocusGoal` and `onChange: (g?: FocusGoal) => void`. Update to:
- `value: FocusGoal[]` (default to `[]`)
- `onChange: (goals: FocusGoal[]) => void`
- Toggle behavior: clicking a selected goal deselects it; clicking an unselected goal adds it to the array
- No max limit — users can pick all 6 if they want
- The `FormData` field changes from `focusGoal?: FocusGoal` to `focusGoal?: FocusGoal[]`

### Calculation changes in `lib/calculations.ts`:

The key design principle: **each active focus goal contributes its adjustments, but conflicting adjustments are averaged rather than stacked**. This prevents unrealistic macro splits.

#### `calculateMacros()` — multi-goal macro blending:
Currently the function applies one focus goal's adjustments. With multiple goals, compute each goal's `carbFraction` delta independently, then average the deltas:

```
// Example: fat-loss (-0.10) + endurance (+0.15) → net delta = +0.025 (average)
// Example: metabolic-health (-0.10) + muscle-gain (+0.10) → net delta = 0 (body recomp)
// Example: fat-loss (-0.10) + muscle-gain (+0.10) → this is body recomp, net = 0
```

For **protein**: take the highest protein demand across all selected goals (not averaged — protein is safe to max). So if fat-loss (1.0 g/lb) and muscle-gain (0.9 g/lb) are both selected, use 1.0 g/lb.

Special combo: if `fat-loss` + `muscle-gain` are both selected → this is a **body recomposition** goal. Add a note in the result (surfaced via a new `recompMode?: boolean` field on `MacroBreakdown` or via an insight) explaining that calorie targets matter less than protein intake and training stimulus.

#### `calculateRecommendations()` — union of all goal supplements/exercises:
Simply union all recommendations from each active goal — no conflict resolution needed here since more is generally fine (e.g., both endurance electrolytes AND creatine for muscle-gain are compatible).

#### `calculateMealTiming()` — priority ranking for conflicting patterns:
Some meal timing patterns fundamentally conflict (e.g., metabolic-health wants time-restricted 16:8, endurance wants pre-workout fueling). Apply this priority order when multiple goals are selected:
1. `metabolic-health` (most structural change — wins over generic patterns)
2. `endurance` (specific pre/post-workout timing)
3. `muscle-gain` (4-meal distribution)
4. `fat-loss` / `longevity` / `general-wellness` (least structural — use default goal-based timing)

So if metabolic-health is selected alongside anything else, use the 16:8 pattern. If endurance is selected without metabolic-health, use the endurance pattern. Etc.

#### `generateInsights()` — additive insights:
Each focus goal that generates insights continues to do so independently. No changes needed to the insight logic itself — it already loops and pushes. Just update any `profile.focusGoal === 'x'` checks to `profile.focusGoal?.includes('x')`.

### What the user sees differently in the results:
- **Macros**: Reflect the blended carb/fat split from all goals. If two goals conflict on carbs, the result lands in between.
- **Supplements**: Full union — all goal-specific supplements appear.
- **Exercise suggestions**: Full union — all goal-specific exercise suggestions appear.
- **Meal timing**: Single pattern based on priority ranking above.
- **Insights**: When fat-loss + muscle-gain are both selected, a new insight appears: "Body Recomposition Mode — With both fat loss and muscle gain selected, focus on hitting your protein target daily and training stimulus rather than the calorie number. At maintenance or a slight deficit, body recomp is achievable for most people with untapped training potential."

---

## Files to Modify

1. `types/index.ts` — add clinical history fields, change `focusGoal` to array
2. `components/TDEEForm.tsx` — add clinical history inputs, update FocusGoalSelector to multi-select
3. `lib/calculations.ts` — update all `profile.focusGoal === x` checks to `.includes(x)`, implement multi-goal macro blending, union supplements/exercises, priority-based meal timing
4. `components/dashboard/RecommendationsPanel.tsx` — no changes needed (supplements/exercises already render from arrays)
5. `components/BloodTestDashboard.tsx` — optionally surface a "body recomp" badge if both fat-loss + muscle-gain are selected

## Backwards Compatibility Notes
- `focusGoal` changing from `T | undefined` to `T[] | undefined` will cause old saved profiles (which stored a single string) to be mistyped when loaded from DB. Add a migration helper: when reading a profile from history, if `focusGoal` is a string (not an array), wrap it in an array: `typeof focusGoal === 'string' ? [focusGoal] : focusGoal`.
- All new clinical history fields are `optional` — no DB migration needed.
