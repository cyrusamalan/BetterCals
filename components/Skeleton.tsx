'use client';

import type { CSSProperties } from 'react';

type BlockProps = {
  className?: string;
  style?: CSSProperties;
};

export function SkeletonBlock({ className = '', style }: BlockProps) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`.trim()}
      style={{ backgroundColor: 'var(--border-light)', ...style }}
      aria-hidden
    />
  );
}

/** Initial load for `/analyze` before localStorage + optional profile fetch resolve. */
export function AnalyzeWizardSkeleton() {
  return (
    <div
      className="min-h-screen px-5 py-8"
      style={{ background: 'var(--page-gradient-simple)' }}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <SkeletonBlock className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-2 min-w-0">
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="h-3 w-48 max-w-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-9 w-24 rounded-xl" />
            <SkeletonBlock className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-6" style={{ border: '1px solid var(--border-light)', backgroundColor: 'var(--surface)' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SkeletonBlock className="h-4 w-64 max-w-full" />
            <SkeletonBlock className="h-3 w-40" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {[1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="rounded-3xl p-6 space-y-5" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="h-3 w-28" />
                <SkeletonBlock className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="h-12 w-full max-w-xs mx-auto rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function HistoryPageSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-warm)' }} aria-busy="true" aria-label="Loading history">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-4 space-y-4">
        <SkeletonBlock className="h-4 w-28" />
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <SkeletonBlock className="h-8 w-64 max-w-[80%]" />
        </div>
        <SkeletonBlock className="h-4 w-full max-w-xl" />
        <SkeletonBlock className="h-3 w-56" />
      </div>
      <div className="max-w-6xl mx-auto px-4 pb-12 space-y-6 mt-2">
        <SkeletonBlock className="h-52 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-64 rounded-2xl" />
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function AnalysisDetailSkeleton() {
  return (
    <div
      className="min-h-screen px-4 py-6"
      style={{ background: 'var(--page-gradient-simple)' }}
      aria-busy="true"
      aria-label="Loading analysis"
    >
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-xl" />
            <SkeletonBlock className="h-6 w-40" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-9 w-24 rounded-xl" />
            <SkeletonBlock className="h-9 w-32 rounded-xl" />
          </div>
        </div>
        <SkeletonBlock className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonBlock className="h-52 rounded-2xl lg:col-span-1" />
          <SkeletonBlock className="h-52 rounded-2xl lg:col-span-2" />
        </div>
        <SkeletonBlock className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}
