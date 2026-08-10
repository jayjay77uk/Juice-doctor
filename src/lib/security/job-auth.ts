import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { isCronConfigured } from '@/lib/env';

/**
 * Scheduler authentication for /api/jobs/run. The external scheduler (Vercel
 * Cron sends `Authorization: Bearer $CRON_SECRET` automatically once the env
 * var exists) must present the shared secret; without CRON_SECRET configured
 * the runner is honestly unavailable (503), never open.
 */
export type JobAuthResult = 'ok' | 'not_configured' | 'unauthorized';

export function authorizeJobRequest(authorizationHeader: string | null): JobAuthResult {
  if (!isCronConfigured()) return 'not_configured';
  const presented = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : '';
  if (!presented) return 'unauthorized';
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(process.env.CRON_SECRET ?? '').digest();
  return timingSafeEqual(a, b) ? 'ok' : 'unauthorized';
}
