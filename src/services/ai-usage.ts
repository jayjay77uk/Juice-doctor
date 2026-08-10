import 'server-only';

import { env } from '@/lib/env';
import { runLogRepo } from './repositories/run-log-repo';

/**
 * AI usage limits — durable per-user daily/monthly request caps (counted
 * from ai_run_logs) plus an in-process concurrent-request guard. Durable counts use
 * the DB so they survive restarts; the concurrency gate is per-instance (best-effort
 * back-pressure). All limits are configurable via env (AI_DAILY_USER_LIMIT, etc.).
 */

export interface UsageDecision {
  allowed: boolean;
  message: string;
  daily: number;
  monthly: number;
  dailyLimit: number;
  monthlyLimit: number;
}

/** Check whether a user may make another request now. Does not reserve a slot. */
export async function checkUsageLimit(userId: string): Promise<UsageDecision> {
  const dailyLimit = env.aiDailyUserLimit;
  const monthlyLimit = env.aiMonthlyUserLimit;
  const [day, month] = await Promise.all([runLogRepo.userUsage(userId, 1), runLogRepo.userUsage(userId, 30)]);
  const base = { daily: day.count, monthly: month.count, dailyLimit, monthlyLimit };
  if (day.count >= dailyLimit) {
    return { ...base, allowed: false, message: `You've reached the daily limit of ${dailyLimit} messages. Please try again tomorrow.` };
  }
  if (month.count >= monthlyLimit) {
    return { ...base, allowed: false, message: `You've reached the monthly limit of ${monthlyLimit} messages this month.` };
  }
  return { ...base, allowed: true, message: '' };
}

// ── In-process concurrency guard (per instance; best-effort) ─────────────────
const MAX_CONCURRENT_PER_USER = 3;
const inFlight = new Map<string, number>();

export function acquireSlot(userId: string): boolean {
  const n = inFlight.get(userId) ?? 0;
  if (n >= MAX_CONCURRENT_PER_USER) return false;
  inFlight.set(userId, n + 1);
  return true;
}

export function releaseSlot(userId: string): void {
  const n = inFlight.get(userId) ?? 0;
  if (n <= 1) inFlight.delete(userId);
  else inFlight.set(userId, n - 1);
}
