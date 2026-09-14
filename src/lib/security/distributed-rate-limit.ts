import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createInMemoryRateLimiter, type RateLimiter, type RateLimitConfig } from './rate-limit';

export function createDistributedRateLimiter(namespace: string, config: RateLimitConfig): RateLimiter {
  const local = createInMemoryRateLimiter(config);
  return { async check(key) {
    const sb = createAdminClient();
    // Local-only development may run without a DB; a deployed app always fails closed.
    if (!sb && process.env.NODE_ENV !== 'production') return local.check(key);
    const resetAt = Math.ceil((Date.now() + 1) / config.windowMs) * config.windowMs;
    const denied = { allowed: false, limit: config.limit, remaining: 0, resetAt };
    if (!sb) return denied;
    try {
      const { data, error } = await sb.rpc('consume_rate_limit', {
        p_key: createHash('sha256').update(`${namespace}:${key}`).digest('hex'),
        p_limit: config.limit, p_window_ms: config.windowMs,
      });
      if (error || typeof data !== 'number') return denied;
      return { allowed: data >= 0, limit: config.limit, remaining: Math.max(0, data), resetAt };
    } catch { return denied; }
  } };
}
