'use client';

import { BookMarked } from 'lucide-react';

const CITATION_TDEE =
  'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247. Total daily energy expenditure applies conventional activity factors to BMR; when body-fat percentage is supplied, lean-mass–based estimation may be used as an alternative.';

const CITATION_CVD =
  "Ten-year cardiovascular risk is estimated with the Framingham General Cardiovascular Disease Profile (D'Agostino RB Sr, et al. Circulation. 2008;117(6):743-753), a validated primary-care model. Displayed risk strata follow thresholds commonly referenced alongside ACC/AHA prevention frameworks—for example, Arnett DK, et al. 2019 ACC/AHA Guideline on the Primary Prevention of Cardiovascular Disease (Circulation. 2019;140(11):e596-e646).";

function SourceTooltip({ citation, label }: { citation: string; label: string }) {
  return (
    <span className="group relative inline-flex align-baseline mx-0.5">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-0.5 transition-colors hover:bg-[var(--border-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
        aria-label={label}
        title={citation}
      >
        <BookMarked className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 rounded-xl border px-3 py-2.5 text-left text-[11px] leading-snug opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {citation}
      </span>
    </span>
  );
}

export default function TechnicalMethodology() {
  return (
    <section
      aria-labelledby="technical-methodology-heading"
      className="relative rounded-2xl noise px-4 py-4 sm:px-5 sm:py-5"
      style={{
        backgroundColor: 'var(--bg-warm)',
        border: '1px solid var(--border-light)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2
          id="technical-methodology-heading"
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Technical methodology
        </h2>
        <p className="text-[10px] font-medium italic" style={{ color: 'var(--text-tertiary)' }}>
          Peer-reviewed equations and guideline-informed risk communication
        </p>
      </div>

      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Estimates are produced for education and self-monitoring; they do not replace clinical judgment.
        Domain health scores aggregate marker-level interpretations against established laboratory reference
        frameworks; caloric needs and long-term cardiovascular risk use the sources below.
      </p>

      <ul className="mt-3 space-y-2.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <li>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Energy expenditure (BMR, TDEE).
          </span>{' '}
          Resting metabolic rate follows the Mifflin–St Jeor equation
          <SourceTooltip label="Citation: Mifflin–St Jeor equation" citation={CITATION_TDEE} />, then
          activity and goal adjustments consistent with standard sports-nutrition practice.
        </li>
        <li>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Cardiovascular risk (10-year estimate).
          </span>{' '}
          Risk is computed with a Framingham-based primary-care equation; displayed strata align with
          ACC/AHA-oriented prevention categories
          <SourceTooltip
            label="Citation: Framingham cardiovascular risk and ACC/AHA prevention context"
            citation={CITATION_CVD}
          />
          . Use these figures to inform—not replace—discussion with your clinician.
        </li>
      </ul>
    </section>
  );
}
