'use client';

import { Stethoscope } from 'lucide-react';

export interface MedicalDisclaimerProps {
  /**
   * When false, nothing is rendered. Use to omit the notice on specific Result or dashboard views.
   * @default true
   */
  show?: boolean;
  className?: string;
  /** Destination for the “Consult a Doctor” CTA (external resource). */
  consultDoctorHref?: string;
  consultDoctorLabel?: string;
}

/**
 * High-visibility legal notice: informational estimates only; not medical advice.
 * Calorie copy references the Mifflin–St Jeor equation used elsewhere in the product.
 */
export default function MedicalDisclaimer({
  show = true,
  className = '',
  consultDoctorHref = 'https://familydoctor.org/',
  consultDoctorLabel = 'Consult a Doctor',
}: MedicalDisclaimerProps) {
  if (!show) {
    return null;
  }

  return (
    <aside
      role="note"
      aria-label="Medical disclaimer"
      className={[
        'rounded-xl border border-l-[4px] px-4 py-3.5 sm:px-5 sm:py-4',
        'shadow-sm',
        'border-[var(--status-info-border)] border-l-[var(--status-info)] bg-[var(--status-info-bg)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:mt-0.5"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--status-info-border)' }}
          aria-hidden
        >
          <Stethoscope className="h-4 w-4" style={{ color: 'var(--status-info)' }} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed">
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Informational use only
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            BetterCals provides informational estimates and educational content. It is not a substitute
            for professional medical advice, diagnosis, or treatment. Calorie targets are derived
            using the{' '}
            <abbr title="Mifflin–St Jeor" className="cursor-help border-b border-dotted border-[var(--border-focus)] no-underline">
              Mifflin–St Jeor
            </abbr>{' '}
            equation for resting energy needs, then adjusted for activity—treat these numbers as
            estimates, not prescriptions.
          </p>
          <div className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
            <a
              href={consultDoctorHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors btn-press"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              {consultDoctorLabel}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <span className="text-xs sm:text-[13px] sm:max-w-[20rem]" style={{ color: 'var(--text-tertiary)' }}>
              Seek care promptly for urgent or emergency symptoms.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
