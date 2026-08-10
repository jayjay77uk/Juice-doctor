'use server';

import { revalidatePath } from 'next/cache';
import { subscriptionsService } from './subscriptions';
import { sendTemplateMail } from './mail';
import type { ActionResult } from './result';
import type { CustomerSubscription, SubscriptionScope, SubscriptionState } from '@/types/crm';
import { assertRole, assertSession } from '@/lib/auth/authorize';

/** Queue the member's state-change email — outbox-recorded, best-effort. */
async function queueStateMail(sub: CustomerSubscription): Promise<void> {
  if (!sub.customerEmail) return;
  try {
    await sendTemplateMail({
      to: sub.customerEmail,
      template: 'subscription.state_changed',
      params: { planName: sub.planName, state: sub.state },
      dedupeKey: `sub-state:${sub.id}:${sub.state}:${sub.updatedAt}`,
    });
  } catch {
    // mail must never block the subscription change
  }
}

/** Subscription states a member may still self-manage (change plan / cancel). */
const MEMBER_LIVE_STATES: SubscriptionState[] = ['active', 'trialing'];

/**
 * A member may only act on their OWN, still-LIVE subscription. A canceled,
 * past-due or suspended subscription can only be changed by an admin (via
 * recordPayment/setState) — a member cannot self-resurrect revoked paid access.
 */
async function assertOwnLiveSubscription(id: string, userId: string): Promise<{ ok: true } | Res> {
  const sub = await subscriptionsService.byId(id);
  if (!sub.ok || sub.data.memberId !== userId) return { ok: false, error: 'Subscription not found.' };
  if (!MEMBER_LIVE_STATES.includes(sub.data.state)) {
    return { ok: false, error: 'This subscription is not active — please contact the team to reactivate it.' };
  }
  return { ok: true };
}

/**
 * Server Actions for subscription management — admin (plans, customer
 * subscriptions, manual payment records) and customer self-serve (cancel /
 * change / upgrade, with no payment step). No payment provider is connected —
 * payments are recorded manually by design.
 */

function revalidateAll(): void {
  revalidatePath('/admin/subscriptions');
  revalidatePath('/dashboard/subscriptions');
  revalidatePath('/dashboard/specialists');
  revalidatePath('/admin');
}

function toList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return [];
  return value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

// ── Admin: plans ─────────────────────────────────────────────────────────────
export async function createPlanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await assertRole('administrator'); } catch { return { status: 'error', message: 'You do not have permission to do this.' }; }
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const scope = (String(formData.get('scope') ?? 'single')) as SubscriptionScope;
  const specialistSlugs = toList(formData.get('specialistSlugs'));
  if (!name) return { status: 'error', message: 'Give the plan a name.' };
  const result = await subscriptionsService.plans.create({ name, description, scope, specialistSlugs });
  if (!result.ok) return { status: 'error', message: result.error.message };
  revalidateAll();
  return { status: 'success', message: 'Plan created. (No price is set — pricing can be added once supplied.)' };
}

export async function archivePlanAction(formData: FormData): Promise<void> {
  await assertRole('administrator');
  await subscriptionsService.plans.archive(String(formData.get('id') ?? ''));
  revalidateAll();
}

// ── Admin: customer subscriptions ────────────────────────────────────────────
type Res = { ok: true } | { ok: false; error: string };

export async function changePlanAction(id: string, planId: string): Promise<Res> {
  try { await assertRole('administrator'); } catch { return { ok: false, error: 'Not authorised.' }; }
  const r = await subscriptionsService.changePlan(id, planId);
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}

export async function setSubStateAction(id: string, state: SubscriptionState): Promise<Res> {
  try { await assertRole('administrator'); } catch { return { ok: false, error: 'Not authorised.' }; }
  const r = await subscriptionsService.setState(id, state);
  if (r.ok) await queueStateMail(r.data);
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}

export async function recordPaymentAction(id: string, note: string): Promise<Res> {
  try { await assertRole('administrator'); } catch { return { ok: false, error: 'Not authorised.' }; }
  const r = await subscriptionsService.recordPayment(id, note);
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}

// ── Customer: manage own access (no payment step) ────────────────────────────
export async function customerCancelAction(id: string): Promise<Res> {
  let userId: string;
  try { userId = (await assertSession()).user.id; } catch { return { ok: false, error: 'Please sign in.' }; }
  const gate = await assertOwnLiveSubscription(id, userId);
  if (!gate.ok) return gate;
  const r = await subscriptionsService.cancel(id);
  if (r.ok) await queueStateMail(r.data);
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}

export async function customerChangePlanAction(id: string, planId: string): Promise<Res> {
  let userId: string;
  try { userId = (await assertSession()).user.id; } catch { return { ok: false, error: 'Please sign in.' }; }
  const gate = await assertOwnLiveSubscription(id, userId);
  if (!gate.ok) return gate;
  // A member may only switch to an ACTIVE plan — archived/draft plans are not
  // valid self-serve targets.
  const plan = await subscriptionsService.plans.byId(planId);
  if (!plan.ok || plan.data.status !== 'active') return { ok: false, error: 'That plan is not available.' };
  const r = await subscriptionsService.changePlan(id, planId);
  if (r.ok) await queueStateMail(r.data);
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}
