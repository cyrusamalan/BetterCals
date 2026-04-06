'use client';

export function SkeletonCard({ height = 'h-48' }: { height?: string }) {
  return (
    <div
      className={`${height} rounded-2xl animate-pulse`}
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    />
  );
}

export function SkeletonChart() {
  return (
    <div
      className="h-64 rounded-2xl animate-pulse flex items-center justify-center"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading chart...</div>
    </div>
  );
}

export function SkeletonText({ width = 'w-32' }: { width?: string }) {
  return (
    <div
      className={`${width} h-4 rounded animate-pulse`}
      style={{ backgroundColor: 'var(--border-light)' }}
    />
  );
}
