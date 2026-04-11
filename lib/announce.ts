/**
 * Announce a message to screen readers via the global ARIA live region.
 * The live region (#a11y-announcer) is rendered in app/layout.tsx.
 */
export function announce(message: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('a11y-announcer');
  if (!el) return;
  // Clear first so repeated identical messages still trigger
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}
