import type { UserProfile } from '@/types';
import { classifyRHR } from '@/lib/vitals';

export default function RestingHeartRateCard({
  restingHeartRate,
  activityLevel,
}: {
  restingHeartRate: number | undefined;
  activityLevel: UserProfile['activityLevel'];
}) {
  const tier = classifyRHR(restingHeartRate, { activityLevel });

  const helperText =
    'Resting heart rate is an independent cardiovascular-risk signal — lower is generally better in healthy adults.';

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
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Resting Heart Rate</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{helperText}</p>
        </div>
      </div>

      <div className="px-5 py-5">
        {tier && restingHeartRate !== undefined ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl tabular-nums" style={{ color: tier.colorVar }}>
                {restingHeartRate}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>bpm</span>
              <span
                className="ml-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg"
                style={{ color: tier.colorVar, backgroundColor: tier.bgVar, border: '1px solid var(--border-light)' }}
              >
                {tier.label}
              </span>
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
              {tier.note}
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
              Note: beta-blockers, thyroid medications, caffeine, poor sleep, and acute stress all shift this reading.
            </p>
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
              Resting heart rate not provided
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Add your typical resting HR in your profile to see how it compares to healthy adult ranges.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
