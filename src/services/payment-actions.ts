'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertRole } from '@/lib/auth/authorize';
import { payments, SUPPORTED_CURRENCIES } from './payments';
import { paymentsRepo } from './repositories/payments-repo';
import { subscriptionsService } from './subscriptions';
import { auditRepo } from './repositories/audit-repo';
import type { ActionResult } from './result';

/**
 * Admin payment actions. Everything here is a REAL record: manual ledger
 * entries, refund states and instalment schedules with admin-entered amounts.
 * Nothing is marked paid automatically and no pricing is invented.
 */

function revalidate(): void {
  revalidatePath('/admin/payments');
  revalidatePath('/admin/subscriptions');
  revalidatePath('/dashboard/subscriptions');
}

const amountSchema = z.object({
  amountPounds: z.coerce
    .number()
    .positive('Enter a positive amount.')
    .max(100_000, 'Amount exceeds the supported maximum.'),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

export async function recordManualPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let actorId: string;
  try { actorId = (await assertRole('administrator')).user.id; } catch { return { status: 'error', message: 'Not authorised.' }; }
  const subscriptionId = String(formData.get('subscriptionId') ?? '');
  if (!subscriptionId) return { status: 'error', message: 'Choose a subscription.' };
  const parsed = amountSchema.safeParse({ amountPounds: formData.get('amount'), currency: formData.get('currency') ?? 'GBP' });
  if (!parsed.success) return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the amount.' };
  const note = String(formData.get('note') ?? '').slice(0, 300);

  const result = await payments.recordManualForSubscription({
    actorId,
    subscriptionId,
    amountMinor: Math.round(parsed.data.amountPounds * 100),
    currency: parsed.data.currency,
    note,
  });
  if (!result.ok) return { status: 'error', message: result.error };
  revalidate();
  return { status: 'success', message: `Recorded ${result.payment.reference}. The member's receipt email is queued in the outbox.` };
}

export async function markPaymentRefundedAction(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  let actorId: string;
  try { actorId = (await assertRole('administrator')).user.id; } catch { return { ok: false, error: 'Not authorised.' }; }
  const result = await payments.markRefunded({ actorId, paymentId });
  revalidate();
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

const instalmentPlanSchema = z.object({
  subscriptionId: z.string().min(1, 'Choose a subscription.'),
  description: z.string().min(3, 'Describe what the schedule covers.').max(300),
  currency: z.enum(SUPPORTED_CURRENCIES),
  // "amount:YYYY-MM-DD" per line — amounts in pounds, admin-entered only.
  schedule: z.string().min(3, 'Add at least one instalment.'),
});

export async function createInstalmentPlanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let actorId: string;
  try { actorId = (await assertRole('administrator')).user.id; } catch { return { status: 'error', message: 'Not authorised.' }; }
  const parsed = instalmentPlanSchema.safeParse({
    subscriptionId: formData.get('subscriptionId'),
    description: formData.get('description'),
    currency: formData.get('currency') ?? 'GBP',
    schedule: formData.get('schedule'),
  });
  if (!parsed.success) return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Check the schedule.' };

  const sub = await subscriptionsService.byId(parsed.data.subscriptionId);
  if (!sub.ok) return { status: 'error', message: 'Subscription not found.' };
  if (!sub.data.memberId) return { status: 'error', message: 'This subscription has no linked member account.' };

  const items: { amountMinor: number; dueDate: string }[] = [];
  for (const line of parsed.data.schedule.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const parts = line.split(':').map((s) => s.trim());
    const amountRaw = parts[0] ?? '';
    const dateRaw = parts[1] ?? '';
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) {
      return { status: 'error', message: `"${line}" — the amount must be a positive number of pounds.` };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw) || Number.isNaN(new Date(dateRaw).getTime())) {
      return { status: 'error', message: `"${line}" — use the format amount:YYYY-MM-DD.` };
    }
    items.push({ amountMinor: Math.round(amount * 100), dueDate: dateRaw });
  }
  if (!items.length) return { status: 'error', message: 'Add at least one instalment line (amount:YYYY-MM-DD).' };
  if (items.length > 36) return { status: 'error', message: 'A schedule supports at most 36 instalments.' };

  const created = await paymentsRepo.instalments.createPlan({
    memberId: sub.data.memberId,
    customerSubscriptionId: sub.data.id,
    description: parsed.data.description,
    currency: parsed.data.currency,
    items,
  });
  if (!created.available || !created.plan) {
    return { status: 'error', message: 'Instalment schedules are not available yet — they require database migration 0031.' };
  }
  await auditRepo.log({ actorId, action: 'payment.instalment_plan_created', entityType: 'payment_instalment_plans', entityId: created.plan.id, after: { items: items.length } });
  revalidate();
  return { status: 'success', message: `Instalment schedule created with ${items.length} instalment(s).` };
}

/** Mark ONE instalment paid by recording a real manual ledger payment for it. */
export async function markInstalmentPaidAction(instalmentId: string, planId: string): Promise<{ ok: boolean; error?: string }> {
  let actorId: string;
  try { actorId = (await assertRole('administrator')).user.id; } catch { return { ok: false, error: 'Not authorised.' }; }
  const { plan } = await paymentsRepo.instalments.planById(planId);
  const instalment = plan?.instalments.find((i) => i.id === instalmentId);
  if (!plan || !instalment) return { ok: false, error: 'Instalment not found.' };
  if (instalment.status !== 'pending') return { ok: false, error: 'This instalment is not pending.' };

  const payment = await paymentsRepo.insert({
    memberId: plan.memberId,
    amountMinor: instalment.amountMinor,
    currency: plan.currency,
    status: 'succeeded',
    provider: 'manual',
    description: `Instalment ${instalment.sequence} — ${plan.description}`,
  });
  if (!payment) return { ok: false, error: 'Could not record the payment.' };
  // Atomically claim the instalment (compare-and-set pending→paid). If a
  // concurrent request already claimed it, COMPENSATE by deleting the ledger
  // row we just wrote so no orphan succeeded payment corrupts the ledger.
  const marked = await paymentsRepo.instalments.markPaid(instalmentId, payment.id);
  if (!marked) {
    await paymentsRepo.instalments._deletePayment(payment.id);
    return { ok: false, error: 'This instalment was already being paid — no duplicate payment was recorded.' };
  }
  await auditRepo.log({ actorId, action: 'payment.instalment_paid', entityType: 'payment_instalments', entityId: instalmentId, after: { paymentId: payment.id } });
  revalidate();
  return { ok: true };
}

export async function cancelInstalmentPlanAction(planId: string): Promise<{ ok: boolean; error?: string }> {
  let actorId: string;
  try { actorId = (await assertRole('administrator')).user.id; } catch { return { ok: false, error: 'Not authorised.' }; }
  const done = await paymentsRepo.instalments.cancelPlan(planId);
  if (!done) return { ok: false, error: 'Could not cancel the schedule.' };
  await auditRepo.log({ actorId, action: 'payment.instalment_plan_cancelled', entityType: 'payment_instalment_plans', entityId: planId });
  revalidate();
  return { ok: true };
}
