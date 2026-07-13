import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Usage-limit decision logic. The DB counter (runLogRepo.userUsage) is mocked so no
 * real database or paid API is touched.
 */

const usage = vi.hoisted(() => ({ day: 0, month: 0 }));

vi.mock('./repositories/run-log-repo', () => ({
  runLogRepo: {
    userUsage: vi.fn(async (_userId: string, days: number) => ({ count: days <= 1 ? usage.day : usage.month, costMicros: 0 })),
  },
}));

const { checkUsageLimit, acquireSlot, releaseSlot } = await import('./ai-usage');
const { env } = await import('@/lib/env');

beforeEach(() => {
  usage.day = 0;
  usage.month = 0;
});

describe('AI usage limits', () => {
  it('allows a request under the limits', async () => {
    usage.day = 1;
    usage.month = 5;
    const d = await checkUsageLimit('u1');
    expect(d.allowed).toBe(true);
    expect(d.dailyLimit).toBe(env.aiDailyUserLimit);
  });

  it('blocks when the daily limit is reached', async () => {
    usage.day = env.aiDailyUserLimit;
    const d = await checkUsageLimit('u1');
    expect(d.allowed).toBe(false);
    expect(d.message).toMatch(/daily limit/i);
  });

  it('blocks when the monthly limit is reached', async () => {
    usage.day = 0;
    usage.month = env.aiMonthlyUserLimit;
    const d = await checkUsageLimit('u1');
    expect(d.allowed).toBe(false);
    expect(d.message).toMatch(/monthly limit/i);
  });

  it('enforces a per-user concurrency cap', () => {
    expect(acquireSlot('c1')).toBe(true);
    expect(acquireSlot('c1')).toBe(true);
    expect(acquireSlot('c1')).toBe(true);
    expect(acquireSlot('c1')).toBe(false); // 4th blocked
    releaseSlot('c1');
    expect(acquireSlot('c1')).toBe(true);
  });
});
