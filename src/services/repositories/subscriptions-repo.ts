import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from '../result';
import type { SpecialistPlan, CustomerSubscription, ManualPayment, SubscriptionScope, SubscriptionState } from '@/types/crm';
import { specialists } from '../specialists';

/** Real repository for the AI specialist subscription tables. */

const STARTER_PLANS = [
  { name: 'Single specialist', description: 'Access to one specialist AI.', scope: 'single', specialist_slugs: ['makela'], price_label: 'Price on request', status: 'active' },
  { name: 'Selected specialists', description: 'Access to a chosen set of specialist AIs.', scope: 'multiple', specialist_slugs: ['makela', 'serena'], price_label: 'Price on request', status: 'active' },
  { name: 'All-access', description: 'Access to every available specialist AI.', scope: 'all', specialist_slugs: [] as string[], price_label: 'Price on request', status: 'active' },
];

let plansSeeded = false;

async function ensurePlans(sb: SupabaseClient): Promise<void> {
  if (plansSeeded) return;
  const { count, error } = await sb.from('subscription_plans').select('id', { count: 'exact', head: true });
  if (error) return;
  if ((count ?? 0) === 0) await sb.from('subscription_plans').insert(STARTER_PLANS);
  plansSeeded = true;
}

function rowToPlan(r: Record<string, unknown>): SpecialistPlan {
  return { id: String(r.id), name: String(r.name), description: String(r.description ?? ''), scope: (r.scope as SubscriptionScope) ?? 'all', specialistSlugs: Array.isArray(r.specialist_slugs) ? r.specialist_slugs as string[] : [], priceLabel: String(r.price_label ?? 'Price on request'), status: (r.status as SpecialistPlan['status']) ?? 'active' };
}

function rowToSub(r: Record<string, unknown>): CustomerSubscription {
  return { id: String(r.id), memberId: String(r.member_id ?? ''), customerName: String(r.customer_name), customerEmail: String(r.customer_email), planId: String(r.plan_id ?? ''), planName: String(r.plan_name), scope: (r.scope as SubscriptionScope) ?? 'all', specialistSlugs: Array.isArray(r.specialist_slugs) ? r.specialist_slugs as string[] : [], state: (r.state as SubscriptionState) ?? 'active', startedAt: String(r.started_at ?? ''), lastPaymentAt: (r.last_payment_at as string | null) ?? null, createdAt: String(r.created_at), updatedAt: String(r.updated_at) };
}

async function resolveAccess(scope: SubscriptionScope, slugs: string[]): Promise<string[]> {
  if (scope !== 'all') return slugs;
  const result = await specialists.all();
  return result.ok ? result.data.map((s) => s.slug) : [];
}

function noDb<T>(): Result<T> { return err({ code: 'unavailable', message: 'The subscriptions database is not available.' }); }

export const subscriptionsRepo = {
  plans: {
    async list(): Promise<Result<SpecialistPlan[]>> {
      const sb = createAdminClient(); if (!sb) return noDb(); await ensurePlans(sb);
      const { data, error } = await sb.from('subscription_plans').select('*').eq('is_active', true).eq('status', 'active').order('sort_order').order('created_at');
      if (error) return noDb(); return ok((data ?? []).map(rowToPlan));
    },
    async all(): Promise<Result<SpecialistPlan[]>> {
      const sb = createAdminClient(); if (!sb) return noDb(); await ensurePlans(sb);
      const { data, error } = await sb.from('subscription_plans').select('*').order('sort_order').order('created_at');
      if (error) return noDb(); return ok((data ?? []).map(rowToPlan));
    },
    async byId(id: string): Promise<Result<SpecialistPlan>> {
      const sb = createAdminClient(); if (!sb) return noDb();
      const { data, error } = await sb.from('subscription_plans').select('*').eq('id', id).maybeSingle();
      if (error || !data) return err({ code: 'not_found', message: 'Plan not found.' }); return ok(rowToPlan(data));
    },
    async create(input: { name: string; description: string; scope: SubscriptionScope; specialistSlugs: string[] }): Promise<Result<SpecialistPlan>> {
      const sb = createAdminClient(); if (!sb) return noDb(); if (!input.name.trim()) return err({ code: 'invalid', message: 'Give the plan a name.' });
      const { data, error } = await sb.from('subscription_plans').insert({ name: input.name.trim(), description: input.description.trim(), scope: input.scope, specialist_slugs: input.scope === 'all' ? [] : input.specialistSlugs, price_label: 'Price on request', status: 'active', is_active: true }).select('*').single();
      if (error || !data) return err({ code: 'invalid', message: 'Could not create the plan.' }); return ok(rowToPlan(data));
    },
    async archive(id: string): Promise<Result<SpecialistPlan>> {
      const sb = createAdminClient(); if (!sb) return noDb();
      const { data, error } = await sb.from('subscription_plans').update({ status: 'archived', is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle();
      if (error || !data) return err({ code: 'not_found', message: 'Plan not found.' }); return ok(rowToPlan(data));
    },
  },
  async list(): Promise<Result<CustomerSubscription[]>> {
    const sb = createAdminClient(); if (!sb) return noDb(); const { data, error } = await sb.from('customer_subscriptions').select('*').order('created_at', { ascending: false });
    if (error) return noDb(); return ok((data ?? []).map(rowToSub));
  },
  async summary(): Promise<Result<{ total: number; active: number; trialing: number; pastDue: number; canceled: number }>> {
    const result = await subscriptionsRepo.list();
    if (!result.ok) return result;
    return ok({
      total: result.data.length,
      active: result.data.filter((s) => s.state === 'active').length,
      trialing: result.data.filter((s) => s.state === 'trialing').length,
      pastDue: result.data.filter((s) => s.state === 'past_due' || s.state === 'incomplete').length,
      canceled: result.data.filter((s) => s.state === 'canceled').length,
    });
  },
  async byId(id: string): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient(); if (!sb) return noDb(); const { data } = await sb.from('customer_subscriptions').select('*').eq('id', id).maybeSingle();
    return data ? ok(rowToSub(data)) : err({ code: 'not_found', message: 'Subscription not found.' });
  },
  async byMember(memberId: string): Promise<Result<CustomerSubscription[]>> {
    const sb = createAdminClient(); if (!sb) return noDb(); const { data, error } = await sb.from('customer_subscriptions').select('*').eq('member_id', memberId).order('created_at', { ascending: false });
    if (error) return noDb(); return ok((data ?? []).map(rowToSub));
  },
  async memberAccess(memberId: string): Promise<Result<string[]>> {
    const sb = createAdminClient(); if (!sb) return noDb();
    const { data } = await sb.from('customer_subscriptions').select('scope, specialist_slugs, state').eq('member_id', memberId).in('state', ['active', 'trialing']);
    const slugs = new Set<string>(['makela']);
    for (const row of data ?? []) (await resolveAccess((row.scope as SubscriptionScope) ?? 'all', Array.isArray(row.specialist_slugs) ? row.specialist_slugs as string[] : [])).forEach((s) => slugs.add(s));
    return ok([...slugs]);
  },
  async create(input: { memberId: string; customerName: string; customerEmail: string; planId: string }): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient(); if (!sb) return noDb(); const plan = await subscriptionsRepo.plans.byId(input.planId); if (!plan.ok) return plan;
    const { data, error } = await sb.from('customer_subscriptions').insert({ member_id: input.memberId || null, customer_name: input.customerName, customer_email: input.customerEmail, plan_id: plan.data.id, plan_name: plan.data.name, scope: plan.data.scope, specialist_slugs: await resolveAccess(plan.data.scope, plan.data.specialistSlugs), state: 'active', started_at: new Date().toISOString().slice(0, 10) }).select('*').single();
    if (error || !data) return err({ code: 'invalid', message: 'Could not create the subscription.' }); return ok(rowToSub(data));
  },
  async changePlan(id: string, planId: string): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient(); if (!sb) return noDb(); const plan = await subscriptionsRepo.plans.byId(planId); if (!plan.ok) return plan;
    const { data, error } = await sb.from('customer_subscriptions').update({ plan_id: plan.data.id, plan_name: plan.data.name, scope: plan.data.scope, specialist_slugs: await resolveAccess(plan.data.scope, plan.data.specialistSlugs), state: 'active', updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle();
    if (error || !data) return err({ code: 'not_found', message: 'Subscription not found.' }); return ok(rowToSub(data));
  },
  async setState(id: string, state: SubscriptionState): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient(); if (!sb) return noDb(); const { data, error } = await sb.from('customer_subscriptions').update({ state, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle();
    if (error || !data) return err({ code: 'not_found', message: 'Subscription not found.' }); return ok(rowToSub(data));
  },
  async recordPayment(id: string, note: string): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient(); if (!sb) return noDb(); const { error } = await sb.from('subscription_payments').insert({ subscription_id: id, note: note.trim() || 'Payment recorded' });
    if (error) return err({ code: 'invalid', message: 'Could not record the payment.' }); const { data } = await sb.from('customer_subscriptions').update({ last_payment_at: new Date().toISOString().slice(0, 10), state: 'active', updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    return data ? ok(rowToSub(data)) : err({ code: 'not_found', message: 'Subscription not found.' });
  },
  async cancel(id: string): Promise<Result<CustomerSubscription>> { return this.setState(id, 'canceled'); },
};
