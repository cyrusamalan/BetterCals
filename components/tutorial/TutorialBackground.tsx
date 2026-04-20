import type { CSSProperties } from 'react';

export function TutorialBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

export function tutorialPageBgStyle(): CSSProperties {
  return {
    background:
      'radial-gradient(1200px 600px at 50% -10%, rgba(90, 140, 100, 0.18) 0%, transparent 55%), linear-gradient(180deg, #070a0f 0%, #0c1018 40%, #06080c 100%)',
  };
}
