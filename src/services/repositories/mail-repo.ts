import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Mail outbox repository — the durable record of every email the platform
 * attempted (or was blocked from) sending. Service-role only; the table ships
 * in migration 0031. Until that migration is applied the repo degrades
 * honestly: writes report `persisted: false` and reads return empty — callers
 * already treat delivery as unavailable, nothing is simulated.
 */

export type OutboxStatus = 'queued' | 'blocked' | 'sent' | 'failed';

export interface OutboxRow {
  id: string;
  toAddress: string;
  template: string;
  subject: string;
  status: OutboxStatus;
  provider: string | null;
  providerMessageId: string | null;
  error: string | null;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
  dedupeKey: string | null;
}

/** True when the error means the outbox table has not been migrated yet. */
const tableMissing = (error: { code?: string } | null): boolean =>
  error?.code === 'PGRST205' || error?.code === '42P01';

function rowToOutbox(r: Record<string, unknown>): OutboxRow {
  return {
    id: String(r.id),
    toAddress: String(r.to_address),
    template: String(r.template),
    subject: String(r.subject),
    status: r.status as OutboxStatus,
    provider: (r.provider as string | null) ?? null,
    providerMessageId: (r.provider_message_id as string | null) ?? null,
    error: (r.error as string | null) ?? null,
    attempts: Number(r.attempts) || 0,
    createdAt: String(r.created_at),
    sentAt: (r.sent_at as string | null) ?? null,
    dedupeKey: (r.dedupe_key as string | null) ?? null,
  };
}

export const mailRepo = {
  /**
   * Record an outbox entry. `dedupeKey` makes an enqueue idempotent (unique
   * index) — a duplicate reports `duplicate: true` and callers skip sending.
   */
  async record(input: {
    toAddress: string;
    template: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string | null;
    status: OutboxStatus;
    provider?: string | null;
    providerMessageId?: string | null;
    error?: string | null;
    attempts?: number;
    dedupeKey?: string | null;
  }): Promise<{ persisted: boolean; duplicate: boolean; id: string | null }> {
    const sb = createAdminClient();
    if (!sb) return { persisted: false, duplicate: false, id: null };
    const { data, error } = await sb
      .from('mail_outbox')
      .insert({
        to_address: input.toAddress,
        template: input.template,
        subject: input.subject,
        body_text: input.bodyText,
        body_html: input.bodyHtml ?? null,
        status: input.status,
        provider: input.provider ?? null,
        provider_message_id: input.providerMessageId ?? null,
        error: input.error ?? null,
        attempts: input.attempts ?? 0,
        dedupe_key: input.dedupeKey ?? null,
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') return { persisted: false, duplicate: true, id: null };
      return { persisted: false, duplicate: false, id: null };
    }
    return { persisted: true, duplicate: false, id: String(data.id) };
  },

  /** Update an outbox row after a delivery attempt. Best-effort. */
  async markAttempt(
    id: string,
    outcome: {
      status: OutboxStatus;
      providerMessageId?: string | null;
      error?: string | null;
      attempts: number;
    },
  ): Promise<void> {
    const sb = createAdminClient();
    if (!sb) return;
    await sb
      .from('mail_outbox')
      .update({
        status: outcome.status,
        provider_message_id: outcome.providerMessageId ?? null,
        error: outcome.error ?? null,
        attempts: outcome.attempts,
        ...(outcome.status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
      })
      .eq('id', id);
  },

  /**
   * Blocked/queued mail eligible for (re)delivery once a provider exists.
   * AGE-BOUND: rows older than `maxAgeHours` (default 72h) are NOT delivered —
   * time-sensitive mail (appointment reminders/confirmations, receipts, invite
   * notices) must never flush stale days/weeks later when email is first
   * connected. Stale rows are left for the admin to review, never mass-sent.
   */
  async deliverable(
    limit = 50,
    maxAgeHours = 72,
  ): Promise<{
    available: boolean;
    rows: (OutboxRow & { bodyText: string; bodyHtml: string | null })[];
  }> {
    const sb = createAdminClient();
    if (!sb) return { available: false, rows: [] };
    const cutoff = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();
    const { data, error } = await sb
      .from('mail_outbox')
      .select('*')
      .in('status', ['queued', 'blocked'])
      .lt('attempts', 3)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) return { available: !tableMissing(error), rows: [] };
    return {
      available: true,
      rows: (data ?? []).map((r) => ({
        ...rowToOutbox(r),
        bodyText: String(r.body_text ?? ''),
        bodyHtml: (r.body_html as string | null) ?? null,
      })),
    };
  },

  /** Recent outbox activity for the admin integration view. */
  async recent(limit = 15): Promise<{ available: boolean; rows: OutboxRow[] }> {
    const sb = createAdminClient();
    if (!sb) return { available: false, rows: [] };
    const { data, error } = await sb
      .from('mail_outbox')
      .select(
        'id, to_address, template, subject, status, provider, provider_message_id, error, attempts, created_at, sent_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { available: !tableMissing(error), rows: [] };
    return { available: true, rows: (data ?? []).map(rowToOutbox) };
  },

  /** Counts by status for the integration centre. Empty when table missing. */
  async statusCounts(): Promise<{ available: boolean; counts: Record<string, number> }> {
    const sb = createAdminClient();
    if (!sb) return { available: false, counts: {} };
    const { data, error } = await sb.from('mail_outbox').select('status').limit(5000);
    if (error) return { available: false, counts: {} };
    const counts: Record<string, number> = {};
    for (const r of data ?? []) counts[String(r.status)] = (counts[String(r.status)] ?? 0) + 1;
    return { available: true, counts };
  },
};
