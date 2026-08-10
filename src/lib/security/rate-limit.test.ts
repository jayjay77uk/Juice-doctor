import { describe, it, expect } from 'vitest';
import { createInMemoryRateLimiter, enforceRateLimit } from './rate-limit';
import { RateLimitError } from './errors';

describe('in-memory fixed-window rate limiter', () => {
  it('allows up to the limit then denies within the window', async () => {
    let now = 1_000;
    const limiter = createInMemoryRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    expect((await limiter.check('k')).allowed).toBe(true);
    expect((await limiter.check('k')).allowed).toBe(true);
    expect((await limiter.check('k')).allowed).toBe(true);
    expect((await limiter.check('k')).allowed).toBe(false);
    // A different key has its own bucket.
    expect((await limiter.check('other')).allowed).toBe(true);
    // The window resets.
    now += 61_000;
    expect((await limiter.check('k')).allowed).toBe(true);
  });

  it('enforceRateLimit throws RateLimitError when exceeded', async () => {
    const limiter = createInMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    await enforceRateLimit(limiter, 'k');
    await expect(enforceRateLimit(limiter, 'k')).rejects.toBeInstanceOf(RateLimitError);
  });
});
