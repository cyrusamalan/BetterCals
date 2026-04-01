'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const OPTIONS = [
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
  { mode: 'system', icon: Laptop, label: 'System' },
] as const;

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl p-1"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      aria-label="Theme toggle"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => setMode(option.mode)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold btn-press"
            style={{
              backgroundColor: active ? 'var(--accent-subtle)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-tertiary)',
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
