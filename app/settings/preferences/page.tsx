'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';

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
  options: { label: string; value: T; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{ background: 'var(--segmented-bg)', border: '1px solid var(--border)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: active ? 'var(--segmented-active-bg)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
              boxShadow: active ? 'var(--segmented-active-shadow)' : 'none',
            }}
          >
            {opt.icon}
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
  const { theme, setTheme } = useTheme();

  const setPrefs = useCallback((updater: (prev: Preferences) => Preferences) => {
    writePrefs(updater(parsePrefs(getPrefsSnapshot())));
  }, []);

  return (
    <div>
      {/* ── Appearance ── */}
      <div
        className="rounded-2xl p-6 mb-5"
        style={{
          background: 'var(--card-bg)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h2 className="font-display text-lg leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          Appearance
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Choose how BetterCals looks.
        </p>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Theme</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Light or dark mode</p>
          </div>
          <Segmented<Theme>
            options={[
              { label: 'Light', value: 'light', icon: <Sun className="w-3.5 h-3.5" /> },
              { label: 'Dark', value: 'dark', icon: <Moon className="w-3.5 h-3.5" /> },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </div>
      </div>

      {/* ── Units ── */}
      <div
        className="rounded-2xl p-6 mb-5"
        style={{
          background: 'var(--card-bg)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
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
