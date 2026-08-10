import 'server-only';

import { getPaymentProvider, isPaymentProviderConfigured, type PaymentEvent } from '@/lib/payments/provider';
import { paymentsRepo, paymentReference, type PaymentRecord, type InstalmentPlan } from './repositories/payments-repo';
import { subscriptionsRepo } from './repositories/subscriptions-repo';
import { auditRepo } from './repositories/audit-repo';
import { sendTemplateMail } from './mail';

/**
 * Payment domain service — provider-neutral by design.
 *
 * Ground rules (enforced here, not just documented):
 *  - Nothing is EVER marked paid automatically: a succeeded ledger row comes
 *    only from an admin's explicit manual record today, or a verified provider
 *    webhook event once a provider is connected.
 *  - No invented pricing: every amount is admin-entered; plans stay
 *    "Price on request" until the client supplies pricing.
 *  - Refunds are STATE records (reconciliation) until a provider exists to
 *    execute them.
 */

export const SUPPORTED_CURRENCIES = ['GBP', 'USD', 'EUR'] as const;

export function validateAmount(amountMinor: number, currency: string): string | null {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) return 'Amount must be a positive whole number of pence/cents.';
  if (amountMinor > 10_000_000) return 'Amount exceeds the supported maximum.';
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) return `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}.`;
  return null;
}

export function formatAmount(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amountMinor / 100);
}

export const payments = {
  /**
   * Record a manual payment against a subscription (admin action). Creates a
   * real ledger row, records the subscription payment note, bumps
   * last_payment_at, and queues the member's receipt email.
   */
  async recordManualForSubscription(input: {
    actorId: string;
    subscriptionId: string;
    amountMinor: number;
    currency: string;
    note: string;
  }): Promise<{ ok: true; payment: PaymentRecord } | { ok: false; error: string }> {
    const invalid = validateAmount(input.amountMinor, input.currency);
    if (invalid) return { ok: false, error: invalid };
    const sub = await subscriptionsRepo.byId(input.subscriptionId);
    if (!sub.ok) return { ok: false, error: 'Subscription not found.' };
    if (!sub.data.memberId) {
      return { ok: false, error: 'This subscription has no linked member account — link the member before recording a ledger payment.' };
    }
    const description = `Subscription "${sub.data.planName}" — ${input.note.trim() || 'manual payment record'}`;
    const payment = await paymentsRepo.insert({
      memberId: sub.data.memberId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: 'succeeded',
      provider: 'manual',
      description,
    });
    if (!payment) return { ok: false, error: 'Could not record the payment.' };
    // Keep the existing subscription payment trail + last_payment_at in step.
    await subscriptionsRepo.recordPayment(input.subscriptionId, `${payment.reference} — ${formatAmount(input.amountMinor, input.currency)} — ${input.note.trim() || 'manual payment record'}`);
    await auditRepo.log({
      actorId: input.actorId,
      action: 'payment.recorded_manual',
      entityType: 'payments',
      entityId: payment.id,
      after: { reference: payment.reference, amountMinor: input.amountMinor, currency: input.currency, subscriptionId: input.subscriptionId },
    });
    if (sub.data.customerEmail) {
      try {
        await sendTemplateMail({
          to: sub.data.customerEmail,
          template: 'payment.recorded',
          params: { reference: payment.reference, amountFormatted: formatAmount(input.amountMinor, input.currency), description },
          dedupeKey: `payment-receipt:${payment.id}`,
        });
      } catch {
        // receipt mail must never block the record
      }
    }
    return { ok: true, payment };
  },

  /**
   * Mark a ledger payment refunded — a RECONCILIATION record. Until a payment
   * provider is connected no money moves; once connected, the provider refund
   * is requested first and the state only changes when it succeeds.
   */
  async markRefunded(input: { actorId: string; paymentId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
    const existing = await paymentsRepo.byId(input.paymentId);
    if (!existing) return { ok: false, error: 'Payment not found.' };
    if (existing.status !== 'succeeded') return { ok: false, error: 'Only a succeeded payment can be refunded.' };

    const provider = getPaymentProvider();
    if (provider && existing.provider === provider.key && existing.providerPaymentId) {
      const result = await provider.refund(existing.providerPaymentId);
      if (!result.ok) return { ok: false, error: result.error ?? 'The provider refund failed — the payment state was not changed.' };
    }
    const updated = await paymentsRepo.setStatus(input.paymentId, 'refunded');
    if (!updated) return { ok: false, error: 'Could not update the payment.' };
    await auditRepo.log({
      actorId: input.actorId,
      action: provider ? 'payment.refunded' : 'payment.refund_recorded_manual',
      entityType: 'payments',
      entityId: input.paymentId,
      before: { status: existing.status },
      after: { status: 'refunded' },
    });
    return { ok: true };
  },

  /** Outstanding balance for an instalment plan — real admin-entered amounts only. */
  outstanding(plan: InstalmentPlan): { dueMinor: number; overdueMinor: number; paidMinor: number } {
    const now = new Date().toISOString().slice(0, 10);
    let dueMinor = 0;
    let overdueMinor = 0;
    let paidMinor = 0;
    for (const item of plan.instalments) {
      if (item.status === 'paid') paidMinor += item.amountMinor;
      if (item.status === 'pending') {
        dueMinor += item.amountMinor;
        if (item.dueDate < now) overdueMinor += item.amountMinor;
      }
    }
    return { dueMinor, overdueMinor, paidMinor };
  },

  /**
   * Process a VERIFIED provider event — the single pipeline the webhook route
   * uses once a provider is connected. Idempotent via the webhook-event store;
   * only a verified `payment_succeeded` may mark a pending payment succeeded.
   */
  async processProviderEvent(providerKey: string, event: PaymentEvent): Promise<{ processed: boolean; reason: string }> {
    // Idempotency store: only a PROCESSED prior delivery may short-circuit a
    // replay. A row left 'received'/'failed' by a crash or transient error is
    // reclaimed so the event is retried, never silently dropped.
    const recorded = await paymentsRepo.webhookEvents.recordOnceReclaimable({
      provider: providerKey,
      externalEventId: event.externalEventId,
      eventType: event.type,
      payload: { providerPaymentId: event.providerPaymentId, amountMinor: event.amountMinor, currency: event.currency, reference: event.reference },
    });
    if (!recorded.available) return { processed: false, reason: 'event_store_unavailable' };
    if (recorded.alreadyProcessed) return { processed: true, reason: 'duplicate_event' };
    if (!recorded.id) return { processed: false, reason: 'event_store_unavailable' };
    const eventId = recorded.id;

    const finish = async (outcome: { processed: boolean; reason: string }): Promise<{ processed: boolean; reason: string }> => {
      await paymentsRepo.webhookEvents.markProcessed(eventId, {
        status: outcome.processed ? 'processed' : 'failed',
        error: outcome.processed ? null : outcome.reason,
      });
      return outcome;
    };

    const existing = await paymentsRepo.byProviderPaymentId(providerKey, event.providerPaymentId);
    if (!existing) return finish({ processed: false, reason: 'unknown_provider_payment' });

    if (event.type === 'payment_succeeded') {
      if (existing.status === 'succeeded') return finish({ processed: true, reason: 'already_succeeded' });
      // A succeeded event must carry a matching amount AND currency, and may
      // only advance a PENDING payment — never resurrect a refunded/failed one.
      if (event.amountMinor == null || event.amountMinor !== existing.amountMinor) {
        return finish({ processed: false, reason: 'amount_mismatch' });
      }
      if (event.currency != null && event.currency.toUpperCase() !== existing.currency.toUpperCase()) {
        return finish({ processed: false, reason: 'currency_mismatch' });
      }
      // Compare-and-set pending → succeeded; a lost race or non-pending state
      // is reported honestly, never forced.
      const moved = await paymentsRepo.transition(existing.id, 'pending', 'succeeded');
      return finish(moved ? { processed: true, reason: 'marked_succeeded' } : { processed: false, reason: 'not_pending' });
    }
    if (event.type === 'payment_failed') {
      const moved = await paymentsRepo.transition(existing.id, 'pending', 'failed');
      return finish({ processed: true, reason: moved ? 'marked_failed' : 'ignored_terminal_state' });
    }
    // payment_refunded — only a succeeded payment can be refunded.
    const moved = await paymentsRepo.transition(existing.id, 'succeeded', 'refunded');
    return finish(moved ? { processed: true, reason: 'marked_refunded' } : { processed: false, reason: 'refund_for_non_succeeded' });
  },

  /** Real configuration + ledger state for the admin integration centre. */
  async status(): Promise<{ configured: boolean; providerKey: string | null; selectedProvider: string; summary: Awaited<ReturnType<typeof paymentsRepo.summary>> }> {
    return {
      configured: isPaymentProviderConfigured(),
      providerKey: getPaymentProvider()?.key ?? null,
      selectedProvider: process.env.PAYMENT_PROVIDER ?? '',
      summary: await paymentsRepo.summary(),
    };
  },

  reference: paymentReference,
};
