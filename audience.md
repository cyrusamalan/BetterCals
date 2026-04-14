# Who BetterCals Is For

This document **branches out** from engineering roadmaps. It describes **people and situations** that align with the product, maps them to **what the app already does**, and points to **where deeper technical planning lives** so product, support, and messaging stay consistent.

| Doc | Role |
|-----|------|
| **`implementations.md`** | Prioritized backlog of features to build next. |
| **`ideas.md`** | Broader brainstorm; not everything is committed. |
| **`logic.md`** | Long-term ML / inference architecture (future phases). |
| **`audience.md` (this file)** | **Who** benefits, **why**, and **how** that correlates with the site—no implementation detail. |

---

## You might be a strong fit if…

### You want numbers you can act on, not vague “eat healthy”

You care about **maintenance calories**, macro splits, and **tiered calorie targets** tied to your goal (lose / maintain / gain). You like seeing **TDEE** broken down from profile inputs you control.

**Correlates with:** Step 1 profile wizard, calorie tiers, macros, recommendations panel.

---

### You have lab data (or are willing to use sensible defaults)

You’ve had a **blood panel** (lipids, metabolic markers, vitamins, etc.) or you’re okay starting from **population-based estimates** until you have real labs. You want **one place** that connects those numbers to diet and lifestyle nudges—not a second job in spreadsheets.

**Correlates with:** PDF or manual entry, derived markers (e.g. non-HDL / estimated LDL when needed), health scores by category, deficiencies and risks, marker education.

---

### You’re optimizing prevention or follow-up, not diagnosing yourself

You use labs and scores as **conversation starters** with yourself or your clinician. You understand outputs are **educational and rule-based**, not a substitute for medical advice or emergency care.

**Correlates with:** ASCVD context where applicable, disclaimers in UI, export/share flows for doctor visits (see backlog in `implementations.md`).

---

### You improve over time and want to see the arc

You repeat labs every few months, change weight or habits, and want **history**, **trends**, **before/after comparisons**, and **forecasts** when there’s enough data—so “did this work?” is visible.

**Correlates with:** Saved analyses (signed-in), `/history`, comparison mode, trend charts.

---

### You’re busy and want a fast path

You sometimes only want **calories and macros** without entering blood work first; you’ll add labs later when you have them.

**Correlates with:** “Calories-only” / quick path on the analyze flow, local progress persistence, optional sign-in for cloud history.

---

## Audiences that overlap our backlog (not yet full product)

These groups **correlate with directions** in `implementations.md` and `ideas.md`; the site may only partially serve them today.

| Audience | Why they’d care | Where it’s headed |
|----------|-----------------|-------------------|
| **Wearable / sleep power users** | Sleep and activity change how aggressive nutrition advice should feel. | Wearable integration (backlog). |
| **Meal loggers** | Close the loop between targets and what they actually eat. | Food logger + USDA (ideas / backlog). |
| **People on long-term meds** | Statin, metformin, etc. change how to read trends. | Meds tracker (ideas / backlog). |
| **Researchers or power users** | Want raw exports and reproducible history. | CSV/JSON export (backlog). |

For **ML-heavy** futures (forecasting models, privacy-preserving inference), see **`logic.md`**—that’s intentionally separate from near-term audience promises.

---

## Who should *not* rely on this site alone

- Anyone needing **urgent** or **emergency** medical interpretation.
- Anyone treating app output as a **diagnosis** or **prescription** without a licensed clinician.
- Jurisdictions or use cases where **regulated medical software** is required; BetterCals is a **wellness and education** style tool unless your deployment is explicitly qualified otherwise.

---

## How to use this file

- **Marketing / landing copy:** Pull short “fit” bullets from the sections above; avoid promising backlog-only items until they ship.
- **Onboarding:** Order screens so the **strong-fit** journeys (actionable calories + optional labs + history) are obvious first.
- **Community or support:** Link “is this app for me?” questions here instead of repeating long explanations in chat.

When you add a major feature, consider a **one-line update** under the relevant audience or table so this doc stays correlated with reality.
