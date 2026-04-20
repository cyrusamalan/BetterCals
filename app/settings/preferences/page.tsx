'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

type WeightUnit = 'lbs' | 'kg';
type HeightUnit = 'ftin' | 'cm';

interface Preferences {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

const DEFAULT_PREFS: Preferences = { weightUnit: 'lbs', heightUnit: 'ftin' };
const STORAGE_KEY = 'bettercals_preferences';

function parsePrefs(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      weightUnit: parsed.weightUnit === 'kg' ? 'kg' : 'lbs',
      heightUnit: parsed.heightUnit === 'cm' ? 'cm' : 'ftin',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

const prefsListeners = new Set<() => void>();

function subscribePrefs(callback: () => void): () => void {
  prefsListeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    prefsListeners.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
}

function getPrefsSnapshot(): string {
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

function getPrefsServerSnapshot(): string {
  return '';
}

function writePrefs(next: Preferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    prefsListeners.forEach((cb) => cb());
  } catch {
    // ignore quota errors
  }
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{ background: 'var(--border-light)', border: '1px solid var(--border)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: active ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              boxShadow: active ? '0 1px 3px rgba(0, 0, 0, 0.06)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PreferencesSettingsPage() {
  const raw = useSyncExternalStore(subscribePrefs, getPrefsSnapshot, getPrefsServerSnapshot);
  const prefs = useMemo(() => parsePrefs(raw), [raw]);

  const setPrefs = useCallback((updater: (prev: Preferences) => Preferences) => {
    writePrefs(updater(parsePrefs(getPrefsSnapshot())));
  }, []);

  return (
    <div>
      <div
        className="rounded-2xl p-6 mb-5"
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04), 0 12px 48px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h2 className="font-display text-lg leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          Units
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Choose how weight and height are displayed.
        </p>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Weight</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pounds or kilograms</p>
            </div>
            <Segmented<WeightUnit>
              options={[{ label: 'lbs', value: 'lbs' }, { label: 'kg', value: 'kg' }]}
              value={prefs.weightUnit}
              onChange={(v) => setPrefs((p) => ({ ...p, weightUnit: v }))}
            />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Height</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Feet/inches or centimeters</p>
            </div>
            <Segmented<HeightUnit>
              options={[{ label: 'ft / in', value: 'ftin' }, { label: 'cm', value: 'cm' }]}
              value={prefs.heightUnit}
              onChange={(v) => setPrefs((p) => ({ ...p, heightUnit: v }))}
            />
          </div>
        </div>

        <p
          className="mt-5 text-[11px] leading-relaxed"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Unit preferences will apply to profile forms and summaries in a future update.
        </p>
      </div>
    </div>
  );
}
