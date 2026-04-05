Here's what could still be implemented, roughly prioritized:

### High Priority (stability & correctness)
- **Testing framework** — No tests exist. `lib/calculations.ts`, `lib/bloodParser.ts`, and `lib/riskModels.ts` are pure functions ideal for unit tests (Vitest would fit well)
- **Error boundaries** — No `app/error.tsx` or React Error Boundary components; chart failures would white-screen the app
- **API rate limiting** — `/api/extract-blood-report` makes LLM calls with no throttling; vulnerable to abuse
- **Input validation (Zod)** — API routes accept JSON without schema validation; forms lack min/max range checks
- **Database indexes** — `userId` on `analyses` table has no index, will slow down as history grows

### Medium Priority (UX & polish)
- **Server-side image OCR** — `tesseract.js` is installed but image upload returns "not yet enabled server-side"
- **CSV/JSON export** — Only PDF export exists; users often want raw data
- **Skeleton loading states** — Dashboard cards and charts have no placeholder UI while rendering
- **SEO** — No OpenGraph/Twitter Card tags, no `robots.txt`, no `sitemap.xml`, no per-page metadata
- **Accessibility gaps** — No keyboard navigation, no ARIA live regions for form errors, no skip-nav links
- **Consolidated debug logging** — Same hardcoded debug endpoint duplicated in 3+ files; should be a shared utility behind an env flag

### Lower Priority (features & nice-to-haves)
- **Shareable results** — No way to share an analysis via link or email (e.g., token-based read-only URLs)
- **Multi-analysis comparison** — History comparison is 2-way only; no baseline locking or multi-way diff
- **PWA / offline support** — No manifest, no service worker; calculations are client-side so offline mode is feasible
- **i18n** — All text hardcoded in English
- **Lifestyle fields utilization** — `sleepHoursAvg`, `stressLevel`, `dietaryPattern`, `menstrualStatus`, `takingStatins`, `takingThyroidMeds` are defined in types but may not fully influence calculations/recommendations
- **Marker name deduplication** — `MARKER_NAMES` defined in 3 separate files; should be centralized
- **Commented-out code cleanup** — `BloodValuesForm.tsx` has old field definitions that are now in `markerMetadata.ts`

What area interests you most?