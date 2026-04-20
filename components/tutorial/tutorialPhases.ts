/** Durations (ms) per phase index — no cursor; drives typewriter, upload, analyze, results. */
export const TUTORIAL_PHASES = [
  { dur: 400 }, // 0 settle
  { dur: 900 }, // 1 type age
  { dur: 280 }, // 2 pause
  { dur: 1100 }, // 3 type weight
  { dur: 280 }, // 4 pause
  { dur: 1300 }, // 5 type activity
  { dur: 520 }, // 6 upload zone pulse
  { dur: 2100 }, // 7 file + scan
  { dur: 420 }, // 8 scan complete
  { dur: 480 }, // 9 analyze hover
  { dur: 220 }, // 10 analyze click
  { dur: 1500 }, // 11 analyzing
  { dur: 5600 }, // 12 results dwell → loop
] as const;

export const TUTORIAL_PHASE_LAST = TUTORIAL_PHASES.length - 1;

/** First phase index where results view is visible */
export const TUTORIAL_RESULTS_PHASE = 12;
