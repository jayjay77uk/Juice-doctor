import 'server-only';

import { isPosthogConfigured } from '@/lib/env';
import { redactProps, analyticsId, type SafeProps } from './redact';

/**
 * Product-event taxonomy + PostHog transport. Until POSTHOG_API_KEY exists
 * every call is a silent no-op — nothing is buffered, nothing pretends to
 * send. Events carry ONLY redacted operational properties (see redact.ts);
 * the internal AI usage/cost/reliability monitoring in ai_run_logs is
 * independent of this and always on.
 */

/** The operational events the platform captures — the complete taxonomy. */
export const EVENT_TAXONOMY = [
  'member.signed_in',
  'member.registered',
  'receptionist.assessment_started',
  'receptionist.assessment_completed',
  'conversation.started',
  'referral.suggested',
  'escalation.raised',
  'appointment.booked',
  'care_plan.action',
  'knowledge.ingested',
  'ai.failure',
  'provider.failure',
] as const;

export type PlatformEvent = (typeof EVENT_TAXONOMY)[number];

const CAPTURE_TIMEOUT_MS = 3_000;

function posthogHost(): string {
  // A blank POSTHOG_HOST (dashboard artifact) must fall back, not break URLs.
  const configured = process.env.POSTHOG_HOST?.trim();
  return (configured || 'https://eu.i.posthog.com').replace(/\/$/, '');
}

/**
 * Capture one product event. Fire-and-forget and never throws — monitoring
 * must never affect the member experience. `userId` (when known) is one-way
 * hashed; anonymous events use the shared 'server' identity.
 */
export async function track(event: PlatformEvent, props: Record<string, unknown> = {}, userId?: string | null): Promise<void> {
  if (!isPosthogConfigured()) return;
  const safe: SafeProps = redactProps(props);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);
  try {
    await fetch(`${posthogHost()}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_API_KEY,
        event,
        distinct_id: userId ? analyticsId(userId) : 'server',
        properties: safe,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    // never let analytics failures surface
  } finally {
    clearTimeout(timer);
  }
}
