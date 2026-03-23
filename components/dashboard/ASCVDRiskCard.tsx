import type { Insight } from '@/types';

export default function ASCVDRiskCard({
  ascvdRiskScore,
  age,
  hasLipids,
  race,
}: {
  ascvdRiskScore: number | undefined;
  age: number;
  hasLipids: boolean;
  race?: 'white' | 'black' | 'other';
}) {
  const outOfRange = age < 40 || age > 79;

  const tier = (() => {
    if (ascvdRiskScore === undefined) return null;
    if (ascvdRiskScore < 5) return { label: 'Low Risk', color: 'var(--status-normal)', bg: 'var(--status-normal-bg)' };
    if (ascvdRiskScore < 7.5) return { label: 'Borderline Risk', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' };
    if (ascvdRiskScore < 20) return { label: 'Intermediate Risk', color: 'var(--accent-warm)', bg: '#f9f5ec' };
    return { label: 'High Risk', color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' };
  })();

  const helperText =
    'ACC/AHA Pooled Cohort Equations estimate of 10-year risk for an ASCVD event.';

  const message = (() => {
    if (outOfRange) return 'ASCVD risk modeling is validated only for ages 40-79.';
    if (!hasLipids) return 'Total Cholesterol and HDL are required to calculate your 10-year risk.';
    if (ascvdRiskScore === undefined) return 'We could not calculate your risk with the current data.';
    return null;
  })();

  const infoType: Insight['type'] = tier
    ? (tier.label === 'High Risk' ? 'danger' : tier.label === 'Intermediate Risk' ? 'warning' : 'info')
    : 'info';

  const icon = infoType === 'danger' ? '!' : infoType === 'warning' ? '⚠' : 'i';

  return (
    <div
      className="relative overflow-hidden rounded-2xl noise"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.03)',
      }}
    >
      <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ASCVD 10-Year Risk</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{helperText}</p>
        </div>

        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{
            color: infoType === 'danger' ? 'var(--status-danger)' : infoType === 'warning' ? 'var(--status-warning)' : 'var(--text-tertiary)',
            backgroundColor: infoType === 'danger' ? 'var(--status-danger-bg)' : infoType === 'warning' ? 'var(--status-warning-bg)' : 'var(--border-light)',
            border: '1px solid var(--border-light)',
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      <div className="px-5 py-5">
        {tier && ascvdRiskScore !== undefined ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl tabular-nums" style={{ color: tier.color }}>
                  {ascvdRiskScore.toFixed(1)}%
                </span>
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg"
                  style={{ color: tier.color, backgroundColor: tier.bg, border: '1px solid var(--border-light)' }}
                >
                  {tier.label}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                This is an estimate (not a diagnosis). Discuss cardiovascular risk with your clinician.
              </p>
              {race && race !== 'white' && race !== 'black' && (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Note: This model was developed for White and African-American populations and may be less accurate for other groups.
                </p>
              )}
            </div>

            <div className="hidden sm:block">
              <div className="w-40 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-light)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, Math.min(100, ascvdRiskScore))}%`,
                    backgroundColor: tier.color,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>0%</span>
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>20%+</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: 'var(--status-info-bg)',
              border: '1px solid var(--status-info-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              ASCVD risk unavailable
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

