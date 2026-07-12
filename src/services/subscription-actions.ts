'use server';

import { revalidatePath } from 'next/cache';
import { subscriptionsService } from './subscriptions';
import type { ActionResult } from './result';
import type { SubscriptionScope, SubscriptionState } from '@/types/crm';
import { assertRole, assertSession } from '@/lib/auth/authorize';

/**
 * Server Actions for subscription management — admin (plans, customer
 * subscriptions, manual payments) and customer (cancel / change / upgrade in
 * prototype mode). No live payment provider is connected.
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
  return { status: 'success', message: 'Plan created. (Prototype: no price is set — configurable later.)' };
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
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}

export async function recordPaymentAction(id: string, note: string): Promise<Res> {
  try { await assertRole('administrator'); } catch { return { ok: false, error: 'Not authorised.' }; }
  const r = await subscriptionsService.recordPayment(id, note);
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}

// ── Customer: manage own access (prototype) ──────────────────────────────────
export async function customerCancelAction(id: string): Promise<Res> {
  try { await assertSession(); } catch { return { ok: false, error: 'Please sign in.' }; }
  const r = await subscriptionsService.cancel(id);
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}

export async function customerChangePlanAction(id: string, planId: string): Promise<Res> {
  try { await assertSession(); } catch { return { ok: false, error: 'Please sign in.' }; }
  const r = await subscriptionsService.changePlan(id, planId);
  revalidateAll();
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}
