'use server';

import { revalidatePath } from 'next/cache';
import { subscriptionsService } from './subscriptions';
import { sendTemplateMail } from './mail';
import type { ActionResult } from './result';
import type { CustomerSubscription, SubscriptionScope, SubscriptionState } from '@/types/crm';
import { assertRole, assertSession } from '@/lib/auth/authorize';
import { admin } from './admin';
import { auditRepo } from './repositories/audit-repo';

async function queueStateMail(sub: CustomerSubscription): Promise<void> { if (!sub.customerEmail) return; try { await sendTemplateMail({ to: sub.customerEmail, template: 'subscription.state_changed', params: { planName: sub.planName, state: sub.state }, dedupeKey: `sub-state:${sub.id}:${sub.state}:${sub.updatedAt}` }); } catch {} }
const MEMBER_LIVE_STATES: SubscriptionState[] = ['active', 'trialing'];
async function assertOwnLiveSubscription(id: string, userId: string): Promise<{ ok: true } | Res> { const sub = await subscriptionsService.byId(id); if (!sub.ok || sub.data.memberId !== userId) return { ok: false, error: 'Subscription not found.' }; if (!MEMBER_LIVE_STATES.includes(sub.data.state)) return { ok: false, error: 'This subscription is not active — please contact the team to reactivate it.' }; return { ok: true }; }
function revalidateAll(): void { revalidatePath('/admin/subscriptions'); revalidatePath('/dashboard/subscriptions'); revalidatePath('/dashboard/specialists'); revalidatePath('/admin'); }
function toList(value: FormDataEntryValue | null): string[] { if (typeof value !== 'string') return []; return value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean); }
type Res = { ok: true } | { ok: false; error: string };

export async function createPlanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> { try { await assertRole('administrator'); } catch { return { status: 'error', message: 'You do not have permission to do this.' }; } const name = String(formData.get('name') ?? '').trim(); const description = String(formData.get('description') ?? '').trim(); const scope = String(formData.get('scope') ?? 'single') as SubscriptionScope; const specialistSlugs = toList(formData.get('specialistSlugs')); if (!name) return { status: 'error', message: 'Give the plan a name.' }; const result = await subscriptionsService.plans.create({ name, description, scope, specialistSlugs }); if (!result.ok) return { status: 'error', message: result.error.message }; revalidateAll(); return { status: 'success', message: 'Plan created.' }; }
export async function archivePlanAction(formData: FormData): Promise<void> { await assertRole('administrator'); await subscriptionsService.plans.archive(String(formData.get('id') ?? '')); revalidateAll(); }
export async function changePlanAction(id: string, planId: string): Promise<Res> { try { await assertRole('administrator'); } catch { return { ok: false, error: 'Not authorised.' }; } const r = await subscriptionsService.changePlan(id, planId); revalidateAll(); return r.ok ? { ok: true } : { ok: false, error: r.error.message }; }
export async function setSubStateAction(id: string, state: SubscriptionState): Promise<Res> { try { await assertRole('administrator'); } catch { return { ok: false, error: 'Not authorised.' }; } const r = await subscriptionsService.setState(id, state); if (r.ok) await queueStateMail(r.data); revalidateAll(); return r.ok ? { ok: true } : { ok: false, error: r.error.message }; }
export async function recordPaymentAction(id: string, note: string): Promise<Res> { try { await assertRole('administrator'); } catch { return { ok: false, error: 'Not authorised.' }; } const r = await subscriptionsService.recordPayment(id, note); revalidateAll(); return r.ok ? { ok: true } : { ok: false, error: r.error.message }; }

export async function customerSubscribeAction(planId: string): Promise<Res> {
  let session; try { session = await assertSession(); } catch { return { ok: false, error: 'Please sign in.' }; }
  const plan = await subscriptionsService.plans.byId(planId); if (!plan.ok || plan.data.status !== 'active') return { ok: false, error: 'That plan is not available.' };
  const existing = await subscriptionsService.byMember(session.user.id); if (existing.ok && existing.data.some((s) => MEMBER_LIVE_STATES.includes(s.state) && s.planId === planId)) return { ok: true };
  const customerName = session.user.name || session.user.email?.split('@')[0] || 'Member';
  const customerEmail = session.user.email ?? '';
  const r = await subscriptionsService.create({ memberId: session.user.id, customerName, customerEmail, planId }); if (!r.ok) return { ok: false, error: r.error.message }; revalidateAll(); return { ok: true };
}

export async function customerSubscribeFormAction(formData: FormData): Promise<void> { const result = await customerSubscribeAction(String(formData.get('planId') ?? '')); if (!result.ok) throw new Error(result.error); }
export async function customerCancelAction(id: string): Promise<Res> { let userId: string; try { userId = (await assertSession()).user.id; } catch { return { ok: false, error: 'Please sign in.' }; } const gate = await assertOwnLiveSubscription(id, userId); if (!gate.ok) return gate; const r = await subscriptionsService.cancel(id); if (r.ok) await queueStateMail(r.data); revalidateAll(); return r.ok ? { ok: true } : { ok: false, error: r.error.message }; }
export async function customerChangePlanAction(id: string, planId: string): Promise<Res> { let userId: string; try { userId = (await assertSession()).user.id; } catch { return { ok: false, error: 'Please sign in.' }; } const gate = await assertOwnLiveSubscription(id, userId); if (!gate.ok) return gate; const plan = await subscriptionsService.plans.byId(planId); if (!plan.ok || plan.data.status !== 'active') return { ok: false, error: 'That plan is not available.' }; const r = await subscriptionsService.changePlan(id, planId); if (r.ok) await queueStateMail(r.data); revalidateAll(); return r.ok ? { ok: true } : { ok: false, error: r.error.message }; }

/**
 * Grant a registered member access to a plan (administrator). The operational
 * stand-in for checkout while pricing and a payment provider are undecided: it
 * creates a REAL customer_subscriptions row — the same record the entitlement
 * gate reads. It never creates accounts, never takes payment, never invents pricing.
 */
export async function grantAccessAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let actorId: string;
  try { actorId = (await assertRole('administrator')).user.id; } catch { return { status: 'error', message: 'You do not have permission to do this.' }; }
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const planId = String(formData.get('planId') ?? '').trim();
  if (!email.includes('@')) return { status: 'error', message: 'Enter the member\u2019s email address.' };
  if (!planId) return { status: 'error', message: 'Choose a plan.' };

  const plan = await subscriptionsService.plans.byId(planId);
  if (!plan.ok) return { status: 'error', message: 'That plan could not be found.' };

  const member = await admin.users.findByEmail(email);
  if (!member) return { status: 'error', message: `No account exists for ${email}. Ask them to register first (or invite them from Users), then grant access.` };

  const existing = await subscriptionsService.byMember(member.id);
  if (existing.ok && existing.data.some((s) => s.state === 'active' || s.state === 'trialing')) {
    return { status: 'error', message: `${email} already has a live subscription. Change its plan from the table below instead.` };
  }

  const created = await subscriptionsService.create({ memberId: member.id, customerName: member.name || email, customerEmail: email, planId });
  if (!created.ok) return { status: 'error', message: created.error.message };

  await auditRepo.log({ actorId, action: 'subscription.access_granted', entityType: 'customer_subscriptions', entityId: created.data.id, after: { email, plan: plan.data.name, scope: plan.data.scope } });
  revalidateAll();
  return { status: 'success', message: `${email} now has access via \u201c${plan.data.name}\u201d. No payment was recorded.` };
}
