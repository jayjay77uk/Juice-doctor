import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from '../result';
import type {
  SpecialistPlan,
  CustomerSubscription,
  ManualPayment,
  SubscriptionScope,
  SubscriptionState,
} from '@/types/crm';
import { specialists } from '../specialists';

/**
 * Production subscriptions repository over subscription_plans,
 * customer_subscriptions and subscription_payments (migration 0027). Payments
 * remain MANUAL RECORDS by design — no live payment provider is configured in
 * this project, so no card data ever exists here.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

/** The three starter plans (admin-editable data, not invented pricing). */
const STARTER_PLANS = [
  { name: 'Single specialist', description: 'Access to one specialist AI.', scope: 'single', specialist_slugs: ['makela'] },
  { name: 'Selected specialists', description: 'Access to a chosen set of specialist AIs.', scope: 'multiple', specialist_slugs: ['makela', 'serena'] },
  { name: 'All-access', description: 'Access to every available specialist AI.', scope: 'all', specialist_slugs: [] as string[] },
];

let plansSeeded = false;

async function ensurePlans(sb: SupabaseClient): Promise<void> {
  if (plansSeeded) return;
  const { count, error } = await sb.from('subscription_plans').select('id', { count: 'exact', head: true }).eq('organisation_id', ORG);
  if (error) return;
  if ((count ?? 0) === 0) {
    await sb.from('subscription_plans').insert(STARTER_PLANS.map((p) => ({ ...p, organisation_id: ORG })));
  }
  plansSeeded = true;
}

function rowToPlan(r: Record<string, unknown>): SpecialistPlan {
  return {
    id: String(r.id),
    name: String(r.name),
    description: String(r.description ?? ''),
    scope: (r.scope as SubscriptionScope) ?? 'single',
    specialistSlugs: Array.isArray(r.specialist_slugs) ? (r.specialist_slugs as string[]) : [],
    priceLabel: String(r.price_label ?? 'Price on request'),
    status: (r.status as SpecialistPlan['status']) ?? 'active',
  };
}

function rowToSub(r: Record<string, unknown>): CustomerSubscription {
  return {
    id: String(r.id),
    memberId: String(r.member_id ?? ''),
    customerName: String(r.customer_name),
    customerEmail: String(r.customer_email),
    planId: String(r.plan_id ?? ''),
    planName: String(r.plan_name),
    scope: (r.scope as SubscriptionScope) ?? 'single',
    specialistSlugs: Array.isArray(r.specialist_slugs) ? (r.specialist_slugs as string[]) : [],
    state: (r.state as SubscriptionState) ?? 'active',
    startedAt: String(r.started_at ?? ''),
    lastPaymentAt: (r.last_payment_at as string | null) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

async function resolveAccess(scope: SubscriptionScope, slugs: string[]): Promise<string[]> {
  if (scope !== 'all') return slugs;
  const result = await specialists.all();
  return result.ok ? result.data.map((s) => s.slug) : [];
}

function noDb<T>(): Result<T> {
  return err({ code: 'unavailable', message: 'The subscriptions database is not available.' });
}

export const subscriptionsRepo = {
  plans: {
    async list(): Promise<Result<SpecialistPlan[]>> {
      const sb = createAdminClient();
      if (!sb) return noDb();
      await ensurePlans(sb);
      const { data } = await sb.from('subscription_plans').select('*').eq('organisation_id', ORG).eq('status', 'active').order('created_at');
      return ok((data ?? []).map(rowToPlan));
    },
    async all(): Promise<Result<SpecialistPlan[]>> {
      const sb = createAdminClient();
      if (!sb) return noDb();
      await ensurePlans(sb);
      const { data } = await sb.from('subscription_plans').select('*').eq('organisation_id', ORG).order('created_at');
      return ok((data ?? []).map(rowToPlan));
    },
    async byId(id: string): Promise<Result<SpecialistPlan>> {
      const sb = createAdminClient();
      if (!sb) return noDb();
      const { data } = await sb.from('subscription_plans').select('*').eq('id', id).maybeSingle();
      return data ? ok(rowToPlan(data)) : err({ code: 'not_found', message: 'Plan not found.' });
    },
    async create(input: { name: string; description: string; scope: SubscriptionScope; specialistSlugs: string[] }): Promise<Result<SpecialistPlan>> {
      if (!input.name.trim()) return err({ code: 'invalid', message: 'Give the plan a name.' });
      const sb = createAdminClient();
      if (!sb) return noDb();
      const { data, error } = await sb
        .from('subscription_plans')
        .insert({
          organisation_id: ORG,
          name: input.name.trim(),
          description: input.description.trim(),
          scope: input.scope,
          specialist_slugs: input.scope === 'all' ? [] : input.specialistSlugs,
        })
        .select('*')
        .single();
      if (error || !data) return err({ code: 'invalid', message: 'Could not create the plan.' });
      return ok(rowToPlan(data));
    },
    async archive(id: string): Promise<Result<SpecialistPlan>> {
      const sb = createAdminClient();
      if (!sb) return noDb();
      const { data, error } = await sb
        .from('subscription_plans')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error || !data) return err({ code: 'not_found', message: 'Plan not found.' });
      return ok(rowToPlan(data));
    },
  },

  async list(): Promise<Result<CustomerSubscription[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('customer_subscriptions').select('*').eq('organisation_id', ORG).order('created_at', { ascending: false });
    return ok((data ?? []).map(rowToSub));
  },
  async byId(id: string): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('customer_subscriptions').select('*').eq('id', id).maybeSingle();
    return data ? ok(rowToSub(data)) : err({ code: 'not_found', message: 'Subscription not found.' });
  },
  async byMember(memberId: string): Promise<Result<CustomerSubscription[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('customer_subscriptions').select('*').eq('member_id', memberId).order('created_at', { ascending: false });
    return ok((data ?? []).map(rowToSub));
  },
  async memberAccess(memberId: string): Promise<Result<string[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb
      .from('customer_subscriptions')
      .select('scope, specialist_slugs, state')
      .eq('member_id', memberId)
      .in('state', ['active', 'trialing']);
    // Makela is the wellbeing CONCIERGE — the entry point every signed-in
    // member may always talk to, subscription or not; paid access applies to
    // the other seven specialists.
    const slugs = new Set<string>(['makela']);
    for (const row of data ?? []) {
      const resolved = await resolveAccess((row.scope as SubscriptionScope) ?? 'single', Array.isArray(row.specialist_slugs) ? (row.specialist_slugs as string[]) : []);
      resolved.forEach((s) => slugs.add(s));
    }
    return ok([...slugs]);
  },

  async create(input: { memberId: string; customerName: string; customerEmail: string; planId: string }): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const plan = await subscriptionsRepo.plans.byId(input.planId);
    if (!plan.ok) return plan;
    const { data, error } = await sb
      .from('customer_subscriptions')
      .insert({
        organisation_id: ORG,
        member_id: input.memberId || null,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        plan_id: plan.data.id,
        plan_name: plan.data.name,
        scope: plan.data.scope,
        specialist_slugs: await resolveAccess(plan.data.scope, plan.data.specialistSlugs),
        state: 'active',
        started_at: new Date().toISOString().slice(0, 10),
      })
      .select('*')
      .single();
    if (error || !data) return err({ code: 'invalid', message: 'Could not create the subscription.' });
    return ok(rowToSub(data));
  },

  async changePlan(id: string, planId: string): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const plan = await subscriptionsRepo.plans.byId(planId);
    if (!plan.ok) return plan;
    const { data, error } = await sb
      .from('customer_subscriptions')
      .update({
        plan_id: plan.data.id,
        plan_name: plan.data.name,
        scope: plan.data.scope,
        specialist_slugs: await resolveAccess(plan.data.scope, plan.data.specialistSlugs),
        state: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error || !data) return err({ code: 'not_found', message: 'Subscription not found.' });
    return ok(rowToSub(data));
  },
  async setState(id: string, state: SubscriptionState): Promise<Result<CustomerSubscription>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data, error } = await sb
      .from('customer_subscriptions')
      .update({ state, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error || !data) return err({ code: 'not_found', message: 'Subscription not found.' });
    return ok(rowToSub(data));
  },
  async cancel(id: string): Promise<Result<CustomerSubscription>> {
    return subscriptionsRepo.setState(id, 'canceled');
  },
  async recordPayment(id: string, note: string): Promise<Result<ManualPayment>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const sub = await subscriptionsRepo.byId(id);
    if (!sub.ok) return sub;
    const { data, error } = await sb
      .from('subscription_payments')
      .insert({ subscription_id: id, note: note.trim() || 'Manual payment.' })
      .select('*')
      .single();
    if (error || !data) return err({ code: 'invalid', message: 'Could not record the payment.' });
    const nextState = sub.data.state === 'past_due' || sub.data.state === 'incomplete' ? 'active' : sub.data.state;
    await sb
      .from('customer_subscriptions')
      .update({ last_payment_at: new Date().toISOString().slice(0, 10), state: nextState, updated_at: new Date().toISOString() })
      .eq('id', id);
    return ok({ id: String(data.id), subscriptionId: id, amountLabel: 'Recorded manually', note: String(data.note), recordedAt: String(data.created_at) });
  },
  async payments(subscriptionId: string): Promise<Result<ManualPayment[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('subscription_payments').select('*').eq('subscription_id', subscriptionId).order('created_at', { ascending: false });
    return ok(
      (data ?? []).map((r) => ({
        id: String(r.id),
        subscriptionId: String(r.subscription_id),
        amountLabel: 'Recorded manually',
        note: String(r.note),
        recordedAt: String(r.created_at),
      })),
    );
  },

  async summary(): Promise<Result<{ total: number; active: number; trialing: number; pastDue: number; canceled: number }>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('customer_subscriptions').select('state').eq('organisation_id', ORG);
    const rows = data ?? [];
    const by = (s: string) => rows.filter((r) => r.state === s).length;
    return ok({
      total: rows.length,
      active: by('active'),
      trialing: by('trialing'),
      pastDue: by('past_due') + by('incomplete'),
      canceled: by('canceled'),
    });
  },
};
