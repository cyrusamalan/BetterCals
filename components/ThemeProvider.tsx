'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'bettercals-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Hydration-safe defaults: render the same initial UI on server + first client paint,
  // then load the persisted preference after mount.
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const nextMode: ThemeMode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setModeState(nextMode);
    const nextTheme = nextMode === 'system' ? getSystemTheme() : nextMode;
    setResolvedTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (mode !== 'system') return;
      const nextTheme = media.matches ? 'dark' : 'light';
      setResolvedTheme(nextTheme);
      applyTheme(nextTheme);
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [mode]);

  const setMode = (nextMode: ThemeMode) => {
    window.localStorage.setItem(STORAGE_KEY, nextMode);
    setModeState(nextMode);
    const nextTheme = nextMode === 'system' ? getSystemTheme() : nextMode;
    setResolvedTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const value = useMemo(() => ({ mode, resolvedTheme, setMode }), [mode, resolvedTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
