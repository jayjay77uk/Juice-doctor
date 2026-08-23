'use server';

import { assertSession } from '@/lib/auth/authorize';
import { env } from '@/lib/env';
import { getSelfieScanProvider } from './provider';
import { selfieScanSessions } from './sessions';
import { auditRepo } from '@/services/repositories/audit-repo';

export async function startSelfieScanAction(): Promise<
  | { ok: true; launchUrl: string; sessionId: string }
  | { ok: false; error: string }
> {
  let session;
  try {
    session = await assertSession();
  } catch {
    return { ok: false, error: 'Please sign in to start a Remote Selfie Scan.' };
  }

  const provider = getSelfieScanProvider();
  if (!provider) {
    return { ok: false, error: 'Remote Selfie Scan is application-ready but no approved scan provider is connected yet.' };
  }

  try {
    const launch = await provider.createSession({
      userId: session.user.id,
      callbackUrl: `${env.siteUrl}/api/webhooks/selfie-scan`,
      returnUrl: `${env.siteUrl}/remote-selfie-scan`,
    });
    const stored = await selfieScanSessions.create(session.user.id, launch);
    if (!stored) return { ok: false, error: 'The scan session could not be recorded.' };
    await auditRepo.log({
      actorId: session.user.id,
      action: 'selfie_scan.started',
      entityType: 'selfie_scan_sessions',
      entityId: stored.id,
      after: { provider: launch.provider },
    });
    return { ok: true, launchUrl: launch.launchUrl, sessionId: stored.id };
  } catch {
    return { ok: false, error: 'The scan provider could not start a session.' };
  }
}
