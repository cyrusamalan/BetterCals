'use client';

import { useEffect, useState } from 'react';
import { TUTORIAL_PHASE_LAST, TUTORIAL_PHASES } from './tutorialPhases';

export function useTutorialPhase() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const dur = TUTORIAL_PHASES[phase].dur;
    const t = window.setTimeout(() => {
      setPhase((p) => (p >= TUTORIAL_PHASE_LAST ? 0 : p + 1));
    }, dur);
    return () => window.clearTimeout(t);
  }, [phase]);

  return { phase };
}
