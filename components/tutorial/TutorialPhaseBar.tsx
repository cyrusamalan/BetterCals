'use client';

import { TUTORIAL_RESULTS_PHASE } from './tutorialPhases';

/** Three segments: Profile (0–5), Labs (6–8), Analyze+Results (9+). */
export function TutorialPhaseBar({ phase }: { phase: number }) {
  const segProfile = phase < 6;
  const segLabs = phase >= 6 && phase < 9;
  const segEnd = phase >= 9;

  const bar = (active: boolean, label: string) => (
    <div className="flex-1 min-w-0">
      <div
        className="h-1 rounded-full transition-all duration-500"
        style={{
          backgroundColor: active ? 'rgba(125, 200, 138, 0.95)' : 'rgba(255,255,255,0.15)',
          boxShadow: active ? '0 0 14px rgba(125, 200, 138, 0.45)' : 'none',
        }}
      />
      <p
        className="text-[9px] font-semibold uppercase tracking-wider mt-1.5 text-center truncate"
        style={{ color: active ? 'rgba(200, 240, 210, 0.95)' : 'rgba(148,163,184,0.65)' }}
      >
        {label}
      </p>
    </div>
  );

  return (
    <div className="flex items-stretch gap-2 pt-3 px-0.5" role="status" aria-live="polite">
      {bar(segProfile, 'Profile')}
      {bar(segLabs, 'Labs')}
      {bar(segEnd, phase >= TUTORIAL_RESULTS_PHASE ? 'Results' : 'Analyze')}
    </div>
  );
}
