/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Each serverless instance maintains its own window, so this is a best-effort
 * guard rather than a globally precise limit. For strict enforcement, swap in
 * a Redis-backed implementation (e.g. @upstash/ratelimit).
 */

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();

// Periodically prune stale entries to avoid unbounded memory growth.
const PRUNE_INTERVAL_MS = 60_000;
let lastPrune = Date.now();

function prune(windowMs: number) {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of windows) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check whether `key` is within the rate limit.
 *
 * @param key       Unique identifier (e.g. userId or IP)
 * @param maxHits   Maximum requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxHits: number,
  windowMs: number,
): RateLimitResult {
  prune(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = windows.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    windows.set(key, entry);
  }

  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  if (entry.timestamps.length >= maxHits) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxHits - entry.timestamps.length,
    resetMs: windowMs,
  };
}
