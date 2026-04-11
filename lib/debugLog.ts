/**
 * Shared debug logging utility.
 *
 * Sends structured debug events to an external ingest endpoint.
 * Only active when NEXT_PUBLIC_DEBUG_ENDPOINT is set; otherwise a no-op.
 */

const DEBUG_ENDPOINT = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_DEBUG_ENDPOINT ?? '')
  : '';

const DEBUG_SESSION_ID = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_DEBUG_SESSION_ID ?? '')
  : '';

export function debugLog({
  hypothesisId,
  location,
  message,
  data,
}: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  if (!DEBUG_ENDPOINT) return;
  try {
    fetch(DEBUG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        location,
        message,
        hypothesisId,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}
