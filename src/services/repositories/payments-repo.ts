import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Payments repository.
 *
 * Ledger rows live in `public.payments` (migration 0008 — applied live):
 * append-only, amount in minor units, status enum pending|succeeded|failed|
 * refunded, provider + provider_payment_id for the future provider connection.
 * Instalment schedules and webhook-event storage ship in migration 0031 and
 * degrade honestly until it is applied.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface PaymentRecord {
  id: string;
  /** Human-facing reference, derived from the row id — stable, never invented. */
  reference: string;
  memberId: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId: string | null;
  description: string;
  createdAt: string;
}

export interface InstalmentPlan {
  id: string;
  memberId: string;
  customerSubscriptionId: string | null;
  description: string;
  currency: string;
  status: string;
  createdAt: string;
  instalments: Instalment[];
}

export interface Instalment {
  id: string;
  planId: string;
  sequence: number;
  amountMinor: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'cancelled';
  paidPaymentId: string | null;
}

export const paymentReference = (id: string): string => `PAY-${id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;

function rowToPayment(r: Record<string, unknown>): PaymentRecord {
  return {
    id: String(r.id),
    reference: paymentReference(String(r.id)),
    memberId: String(r.member_id),
    amountMinor: Number(r.amount) || 0,
    currency: String(r.currency ?? 'GBP'),
    status: (r.status as PaymentStatus) ?? 'pending',
    provider: String(r.provider ?? 'manual'),
    providerPaymentId: (r.provider_payment_id as string | null) ?? null,
    description: String(r.description ?? ''),
    createdAt: String(r.created_at),
  };
}

function rowToInstalment(r: Record<string, unknown>): Instalment {
  return {
    id: String(r.id),
    planId: String(r.plan_id),
    sequence: Number(r.sequence) || 0,
    amountMinor: Number(r.amount) || 0,
    dueDate: String(r.due_date),
    status: (r.status as Instalment['status']) ?? 'pending',
    paidPaymentId: (r.paid_payment_id as string | null) ?? null,
  };
}

export const paymentsRepo = {
  // ── Ledger (live table) ────────────────────────────────────────────────────
  async insert(input: {
    memberId: string;
    amountMinor: number;
    currency: string;
    status: PaymentStatus;
    provider: string;
    providerPaymentId?: string | null;
    description: string;
  }): Promise<PaymentRecord | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from('payments')
      .insert({
        member_id: input.memberId,
        organisation_id: ORG,
        amount: input.amountMinor,
        currency: input.currency,
        status: input.status,
        provider: input.provider,
        provider_payment_id: input.providerPaymentId ?? null,
        description: input.description.slice(0, 500),
      })
      .select('*')
      .single();
    if (error || !data) return null;
    return rowToPayment(data);
  },

  async byId(id: string): Promise<PaymentRecord | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb.from('payments').select('*').eq('id', id).maybeSingle();
    return data ? rowToPayment(data) : null;
  },

  async byProviderPaymentId(provider: string, providerPaymentId: string): Promise<PaymentRecord | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb
      .from('payments')
      .select('*')
      .eq('provider', provider)
      .eq('provider_payment_id', providerPaymentId)
      .maybeSingle();
    return data ? rowToPayment(data) : null;
  },

  async setStatus(id: string, status: PaymentStatus): Promise<PaymentRecord | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data, error } = await sb.from('payments').update({ status }).eq('id', id).select('*').maybeSingle();
    return !error && data ? rowToPayment(data) : null;
  },

  /**
   * Compare-and-set a payment's status: update ONLY if it is currently `from`.
   * Returns true when the row moved — the sole guard against out-of-order or
   * replayed provider events resurrecting a terminal (refunded/failed) payment.
   */
  async transition(id: string, from: PaymentStatus, to: PaymentStatus): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { data, error } = await sb
      .from('payments')
      .update({ status: to })
      .eq('id', id)
      .eq('status', from)
      .select('id')
      .maybeSingle();
    return !error && Boolean(data);
  },

  /** A member's own payment history, newest first. */
  async forMember(memberId: string, limit = 50): Promise<PaymentRecord[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb
      .from('payments')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map(rowToPayment);
  },

  /** Full ledger for admin, newest first. */
  async list(limit = 100): Promise<PaymentRecord[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb
      .from('payments')
      .select('*')
      .eq('organisation_id', ORG)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map(rowToPayment);
  },

  async summary(): Promise<{ count: number; succeededMinor: number; refundedMinor: number; byCurrency: Record<string, number> }> {
    const sb = createAdminClient();
    if (!sb) return { count: 0, succeededMinor: 0, refundedMinor: 0, byCurrency: {} };
    const { data } = await sb.from('payments').select('amount, currency, status').eq('organisation_id', ORG).limit(5000);
    const rows = data ?? [];
    const byCurrency: Record<string, number> = {};
    let succeededMinor = 0;
    let refundedMinor = 0;
    for (const r of rows) {
      const amount = Number(r.amount) || 0;
      if (r.status === 'succeeded') {
        succeededMinor += amount;
        const cur = String(r.currency ?? 'GBP');
        byCurrency[cur] = (byCurrency[cur] ?? 0) + amount;
      }
      if (r.status === 'refunded') refundedMinor += amount;
    }
    return { count: rows.length, succeededMinor, refundedMinor, byCurrency };
  },

  // ── Instalment schedules (migration 0031 — degrade honestly until applied) ──
  instalments: {
    async createPlan(input: {
      memberId: string;
      customerSubscriptionId?: string | null;
      description: string;
      currency: string;
      items: { amountMinor: number; dueDate: string }[];
    }): Promise<{ available: boolean; plan: InstalmentPlan | null }> {
      const sb = createAdminClient();
      if (!sb) return { available: false, plan: null };
      const { data: planRow, error } = await sb
        .from('payment_instalment_plans')
        .insert({
          organisation_id: ORG,
          member_id: input.memberId,
          customer_subscription_id: input.customerSubscriptionId ?? null,
          description: input.description.slice(0, 300),
          currency: input.currency,
          status: 'active',
        })
        .select('*')
        .single();
      if (error || !planRow) return { available: false, plan: null };
      const { error: itemsError } = await sb.from('payment_instalments').insert(
        input.items.map((item, i) => ({
          plan_id: String(planRow.id),
          sequence: i + 1,
          amount: item.amountMinor,
          due_date: item.dueDate,
          status: 'pending',
        })),
      );
      if (itemsError) {
        await sb.from('payment_instalment_plans').delete().eq('id', String(planRow.id));
        return { available: false, plan: null };
      }
      const plan = await paymentsRepo.instalments.planById(String(planRow.id));
      return { available: true, plan: plan.plan };
    },

    async planById(id: string): Promise<{ available: boolean; plan: InstalmentPlan | null }> {
      const sb = createAdminClient();
      if (!sb) return { available: false, plan: null };
      const { data, error } = await sb.from('payment_instalment_plans').select('*').eq('id', id).maybeSingle();
      if (error || !data) return { available: !error, plan: null };
      const { data: items } = await sb.from('payment_instalments').select('*').eq('plan_id', id).order('sequence');
      return {
        available: true,
        plan: {
          id: String(data.id),
          memberId: String(data.member_id),
          customerSubscriptionId: (data.customer_subscription_id as string | null) ?? null,
          description: String(data.description ?? ''),
          currency: String(data.currency ?? 'GBP'),
          status: String(data.status),
          createdAt: String(data.created_at),
          instalments: (items ?? []).map(rowToInstalment),
        },
      };
    },

    async list(opts?: { memberId?: string }): Promise<{ available: boolean; plans: InstalmentPlan[] }> {
      const sb = createAdminClient();
      if (!sb) return { available: false, plans: [] };
      let query = sb.from('payment_instalment_plans').select('*').order('created_at', { ascending: false }).limit(50);
      if (opts?.memberId) query = query.eq('member_id', opts.memberId);
      const { data, error } = await query;
      if (error) return { available: false, plans: [] };
      const plans: InstalmentPlan[] = [];
      for (const row of data ?? []) {
        const { plan } = await paymentsRepo.instalments.planById(String(row.id));
        if (plan) plans.push(plan);
      }
      return { available: true, plans };
    },

    /** Delete a ledger payment (compensation for a lost instalment-claim race only). */
    async _deletePayment(paymentId: string): Promise<void> {
      const sb = createAdminClient();
      if (!sb) return;
      await sb.from('payments').delete().eq('id', paymentId);
    },

    /** Mark one instalment paid, linked to a real ledger payment. Never automatic. */
    async markPaid(instalmentId: string, paidPaymentId: string): Promise<boolean> {
      const sb = createAdminClient();
      if (!sb) return false;
      const { data, error } = await sb
        .from('payment_instalments')
        .update({ status: 'paid', paid_payment_id: paidPaymentId })
        .eq('id', instalmentId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      return !error && Boolean(data);
    },

    async cancelPlan(planId: string): Promise<boolean> {
      const sb = createAdminClient();
      if (!sb) return false;
      const { error: itemsError } = await sb.from('payment_instalments').update({ status: 'cancelled' }).eq('plan_id', planId).eq('status', 'pending');
      const { data, error } = await sb.from('payment_instalment_plans').update({ status: 'cancelled' }).eq('id', planId).select('id').maybeSingle();
      return !itemsError && !error && Boolean(data);
    },
  },

  // ── Provider webhook events (migration 0031 — idempotency store) ───────────
  webhookEvents: {
    /**
     * Insert-or-reclaim by (provider, external id). Only a row whose prior
     * delivery reached `processed` short-circuits (`alreadyProcessed: true`);
     * a row stuck at 'received' or left 'failed' by a crash/transient error is
     * reclaimed (its id returned) so the event is retried — an event is never
     * silently dropped on the strength of an unfinished first attempt.
     */
    async recordOnceReclaimable(input: { provider: string; externalEventId: string; eventType: string; payload: unknown }): Promise<{ available: boolean; alreadyProcessed: boolean; id: string | null }> {
      const sb = createAdminClient();
      if (!sb) return { available: false, alreadyProcessed: false, id: null };
      const { data, error } = await sb
        .from('provider_webhook_events')
        .insert({
          provider: input.provider,
          external_event_id: input.externalEventId,
          event_type: input.eventType,
          payload: input.payload ?? {},
          status: 'received',
        })
        .select('id')
        .single();
      if (!error && data) return { available: true, alreadyProcessed: false, id: String(data.id) };
      if (error?.code !== '23505') return { available: false, alreadyProcessed: false, id: null };
      // A row already exists — reclaim it unless it is already processed.
      const { data: existing } = await sb
        .from('provider_webhook_events')
        .select('id, status')
        .eq('provider', input.provider)
        .eq('external_event_id', input.externalEventId)
        .maybeSingle();
      if (!existing) return { available: false, alreadyProcessed: false, id: null };
      if (String(existing.status) === 'processed') return { available: true, alreadyProcessed: true, id: null };
      // Reclaim: reset to 'received' for a fresh processing attempt.
      await sb.from('provider_webhook_events').update({ status: 'received', error: null }).eq('id', String(existing.id));
      return { available: true, alreadyProcessed: false, id: String(existing.id) };
    },

    async markProcessed(id: string, outcome: { status: 'processed' | 'failed'; error?: string | null }): Promise<void> {
      const sb = createAdminClient();
      if (!sb) return;
      await sb.from('provider_webhook_events').update({ status: outcome.status, error: outcome.error ?? null }).eq('id', id);
    },

    async recent(provider?: string, limit = 10): Promise<{ available: boolean; rows: { id: string; provider: string; eventType: string; status: string; createdAt: string }[] }> {
      const sb = createAdminClient();
      if (!sb) return { available: false, rows: [] };
      let query = sb.from('provider_webhook_events').select('id, provider, event_type, status, created_at').order('created_at', { ascending: false }).limit(limit);
      if (provider) query = query.eq('provider', provider);
      const { data, error } = await query;
      if (error) return { available: false, rows: [] };
      return {
        available: true,
        rows: (data ?? []).map((r) => ({
          id: String(r.id),
          provider: String(r.provider),
          eventType: String(r.event_type),
          status: String(r.status),
          createdAt: String(r.created_at),
        })),
      };
    },
  },
};
