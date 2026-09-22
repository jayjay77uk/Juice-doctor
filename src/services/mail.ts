import 'server-only';

import { businessAddresses } from '@/config/addresses';
import { isMailConfigured } from '@/lib/env';
import { getMailProvider } from '@/lib/mail/provider';
import {
  renderMailTemplate,
  type MailTemplateKey,
  type MailTemplateParams,
} from '@/lib/mail/templates';
import { track } from '@/lib/monitoring/events';
import { mailRepo } from './repositories/mail-repo';
import { featureFlags } from './feature-flags';
import { followUpMailEligible } from './jobs/mail-eligibility';

/**
 * Server-only mail service — the ONLY path through which the platform sends
 * email. Honesty contract: every attempt is recorded in the outbox; when no
 * provider is connected the record is `blocked` and the caller receives
 * `delivered: false` with reason `not_configured` — no surface may claim an
 * email was sent unless this service reports `delivered: true`.
 */

export interface MailDelivery {
  delivered: boolean;
  /** Whether a durable outbox record exists (false until migration 0031 is applied). */
  recorded: boolean;
  reason: 'sent' | 'not_configured' | 'failed' | 'duplicate';
}

const MAX_ATTEMPTS = 3;

export async function sendTemplateMail<K extends MailTemplateKey>(input: {
  to: string;
  template: K;
  params: MailTemplateParams[K];
  /** Idempotency key — the same key never sends twice (requires the outbox table). */
  dedupeKey?: string;
}): Promise<MailDelivery> {
  if (!(await followUpMailEligible(input.template, input.dedupeKey ?? null, input.to)))
    return { delivered: false, recorded: false, reason: 'not_configured' };
  const rendered = renderMailTemplate(input.template, input.params);
  const provider = (await featureFlags.isEnabled('platform.notifications'))
    ? getMailProvider()
    : null;
  const { replyTo } = businessAddresses();

  if (!provider) {
    const record = await mailRepo.record({
      toAddress: input.to,
      template: input.template,
      subject: rendered.subject,
      bodyText: rendered.text,
      bodyHtml: rendered.html,
      status: 'blocked',
      error: 'email_provider_not_configured',
      dedupeKey: input.dedupeKey ?? null,
    });
    if (record.duplicate) return { delivered: false, recorded: true, reason: 'duplicate' };
    return { delivered: false, recorded: record.persisted, reason: 'not_configured' };
  }

  const record = await mailRepo.record({
    toAddress: input.to,
    template: input.template,
    subject: rendered.subject,
    bodyText: rendered.text,
    bodyHtml: rendered.html,
    status: 'queued',
    provider: provider.key,
    dedupeKey: input.dedupeKey ?? null,
  });
  if (record.duplicate) return { delivered: false, recorded: true, reason: 'duplicate' };
  // Idempotency fails CLOSED: if the caller asked for dedupe but we could not
  // create a durable outbox record (store unavailable / migration 0031 not yet
  // applied), do NOT send — a later rerun would otherwise re-send with no
  // dedupe. The caller sees an honest not-recorded result.
  if (input.dedupeKey && !record.persisted) {
    return { delivered: false, recorded: false, reason: 'not_configured' };
  }

  const result = await provider.send({
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    ...(replyTo ? { replyTo } : {}),
  });

  if (record.id) {
    await mailRepo.markAttempt(record.id, {
      status: result.sent ? 'sent' : result.retryable ? 'queued' : 'failed',
      providerMessageId: result.sent ? result.providerMessageId : null,
      error: result.sent ? null : result.error,
      attempts: 1,
    });
  }
  if (!result.sent)
    await track('provider.failure', {
      provider: provider.key,
      surface: 'mail',
      retryable: result.retryable,
    });
  return result.sent
    ? { delivered: true, recorded: record.persisted, reason: 'sent' }
    : { delivered: false, recorded: record.persisted, reason: 'failed' };
}

/**
 * Deliver queued/blocked outbox rows — invoked by the background-job runner.
 * Without a provider it reports how much mail is waiting and touches nothing.
 */
export async function deliverPendingMail(): Promise<{
  available: boolean;
  pending: number;
  sent: number;
  failed: number;
}> {
  const { available, rows } = await mailRepo.deliverable();
  if (!available) return { available: false, pending: 0, sent: 0, failed: 0 };
  const provider = (await featureFlags.isEnabled('platform.notifications'))
    ? getMailProvider()
    : null;
  if (!provider) return { available: true, pending: rows.length, sent: 0, failed: 0 };
  const { replyTo } = businessAddresses();

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    if (!(await followUpMailEligible(row.template, row.dedupeKey, row.toAddress))) {
      await mailRepo.markAttempt(row.id, {
        status: 'failed',
        error: 'no_longer_eligible',
        attempts: row.attempts,
      });
      failed++;
      continue;
    }
    const result = await provider.send({
      to: row.toAddress,
      subject: row.subject,
      text: row.bodyText,
      ...(row.bodyHtml ? { html: row.bodyHtml } : {}),
      ...(replyTo ? { replyTo } : {}),
    });
    const attempts = row.attempts + 1;
    await mailRepo.markAttempt(row.id, {
      status: result.sent
        ? 'sent'
        : result.retryable && attempts < MAX_ATTEMPTS
          ? 'queued'
          : 'failed',
      providerMessageId: result.sent ? result.providerMessageId : null,
      error: result.sent ? null : result.error,
      attempts,
    });
    if (result.sent) sent += 1;
    else failed += 1;
  }
  return { available: true, pending: rows.length - sent, sent, failed };
}

/** Real configuration + outbox state for the admin integration centre. */
export async function mailStatus(): Promise<{
  configured: boolean;
  addresses: ReturnType<typeof businessAddresses>;
  outboxAvailable: boolean;
  counts: Record<string, number>;
}> {
  const { available, counts } = await mailRepo.statusCounts();
  return {
    configured: isMailConfigured(),
    addresses: businessAddresses(),
    outboxAvailable: available,
    counts,
  };
}
