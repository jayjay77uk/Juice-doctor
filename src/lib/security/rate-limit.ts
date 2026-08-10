import { RateLimitError } from './errors';

/**
 * Rate-limiting abstraction. The interface is production-shaped (async, keyed,
 * returns remaining/reset) so it can be backed by an in-memory store now and by
 * Redis/Upstash or the Postgres `auth_events` table in production without
 * touching call sites. A sensible fixed-window limiter ships as the default.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the window resets. */
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export interface RateLimitConfig {
  /** Max requests per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Wall-clock now(); injectable for tests (module scope must stay deterministic). */
  now?: () => number;
}

/**
 * In-memory fixed-window limiter. Per-instance and best-effort: each serverless
 * instance keeps its own window, so limits are not shared across instances. A
 * distributed store (Redis/Postgres) can implement the same `RateLimiter` later.
 */
export function createInMemoryRateLimiter(config: RateLimitConfig): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  const now = config.now ?? (() => Date.now());
  // Keys are attacker-influenced (e.g. spoofable forwarded-for headers), so the
  // map must not grow without bound: sweep expired buckets once it gets large.
  const SWEEP_THRESHOLD = 5_000;

  return {
    async check(rawKey: string): Promise<RateLimitResult> {
      const key = rawKey.slice(0, 128); // bound per-entry memory
      const ts = now();
      if (buckets.size > SWEEP_THRESHOLD) {
        for (const [k, b] of buckets) {
          if (ts >= b.resetAt) buckets.delete(k);
        }
      }
      const bucket = buckets.get(key);
      if (!bucket || ts >= bucket.resetAt) {
        const resetAt = ts + config.windowMs;
        buckets.set(key, { count: 1, resetAt });
        return { allowed: true, limit: config.limit, remaining: config.limit - 1, resetAt };
      }
      bucket.count += 1;
      const remaining = Math.max(0, config.limit - bucket.count);
      return {
        allowed: bucket.count <= config.limit,
        limit: config.limit,
        remaining,
        resetAt: bucket.resetAt,
      };
    },
  };
}

/** Enforce a limiter, throwing RateLimitError when exceeded. */
export async function enforceRateLimit(limiter: RateLimiter, key: string): Promise<void> {
  const result = await limiter.check(key);
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    throw new RateLimitError(retryAfter);
  }
}

/** Recommended policy presets. Applied per identity/IP at the edge or in actions. */
export const RATE_LIMIT_POLICIES = {
  auth: { limit: 5, windowMs: 60_000 }, // 5 login attempts / minute
  contact: { limit: 3, windowMs: 60_000 },
  api: { limit: 100, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 60_000 }, // unused preset — AI endpoints use durable per-user caps (services/ai-usage) instead
} as const satisfies Record<string, RateLimitConfig>;
