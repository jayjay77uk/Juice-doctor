import 'server-only';

import type {
  SpecialistPlan,
  CustomerSubscription,
  ManualPayment,
  SubscriptionScope,
  SubscriptionState,
} from '@/types/crm';
import { specialists } from './specialists';
import { ok, err, type Result } from './result';

/**
 * Subscriptions service — admin-configurable plans + customer subscriptions.
 * Plans are keyed by ACCESS SCOPE (one / selected-multiple / all specialists);
 * NO final prices are defined (priceLabel is a placeholder). Prototype uses an
 * in-process store and records manual payments only — no live payment provider.
 * Production reads plans + specialist_subscriptions (migration 0015).
 */

const ORG = '00000000-0000-0000-0000-000000000001';
const MEMBER = 'usr_member';
const TS = '2026-07-10T00:00:00.000Z';
let planCounter = 0;
let subCounter = 0;
let payCounter = 0;

function nowIso(): string {
  return new Date().toISOString();
}

const plans: SpecialistPlan[] = [
  { id: 'plan_single', name: 'Single specialist', description: 'Access to one specialist AI.', scope: 'single', specialistSlugs: ['makela'], priceLabel: 'Price on request', status: 'active' },
  { id: 'plan_multiple', name: 'Selected specialists', description: 'Access to a chosen set of specialist AIs.', scope: 'multiple', specialistSlugs: ['makela', 'serena'], priceLabel: 'Price on request', status: 'active' },
  { id: 'plan_all', name: 'All-access', description: 'Access to every available specialist AI.', scope: 'all', specialistSlugs: [], priceLabel: 'Price on request', status: 'active' },
];

const subscriptions: CustomerSubscription[] = [
  { id: 'sub_member', memberId: MEMBER, customerName: 'Prototype User', customerEmail: 'hello@example.com', planId: 'plan_multiple', planName: 'Selected specialists', scope: 'multiple', specialistSlugs: ['makela', 'serena'], state: 'active', startedAt: '2026-06-20', lastPaymentAt: '2026-07-01', createdAt: '2026-06-20T00:00:00.000Z', updatedAt: TS },
  { id: 'sub_a', memberId: 'usr_a', customerName: 'Customer A', customerEmail: 'customer.a@example.com', planId: 'plan_single', planName: 'Single specialist', scope: 'single', specialistSlugs: ['makela'], state: 'active', startedAt: '2026-06-15', lastPaymentAt: '2026-07-01', createdAt: '2026-06-15T00:00:00.000Z', updatedAt: TS },
  { id: 'sub_b', memberId: 'usr_b', customerName: 'Customer B', customerEmail: 'customer.b@example.com', planId: 'plan_all', planName: 'All-access', scope: 'all', specialistSlugs: [], state: 'past_due', startedAt: '2026-05-30', lastPaymentAt: '2026-06-01', createdAt: '2026-05-30T00:00:00.000Z', updatedAt: TS },
  { id: 'sub_c', memberId: 'usr_c', customerName: 'Customer C', customerEmail: 'customer.c@example.com', planId: 'plan_multiple', planName: 'Selected specialists', scope: 'multiple', specialistSlugs: ['aqua', 'sage'], state: 'trialing', startedAt: '2026-07-05', lastPaymentAt: null, createdAt: '2026-07-05T00:00:00.000Z', updatedAt: TS },
  { id: 'sub_d', memberId: 'usr_d', customerName: 'Customer D', customerEmail: 'customer.d@example.com', planId: 'plan_single', planName: 'Single specialist', scope: 'single', specialistSlugs: ['serena'], state: 'canceled', startedAt: '2026-04-10', lastPaymentAt: '2026-05-10', createdAt: '2026-04-10T00:00:00.000Z', updatedAt: TS },
];

const payments: ManualPayment[] = [
  { id: 'pay_1', subscriptionId: 'sub_member', amountLabel: 'Recorded manually', note: 'Prototype demo payment.', recordedAt: '2026-07-01T10:00:00.000Z' },
  { id: 'pay_2', subscriptionId: 'sub_a', amountLabel: 'Recorded manually', note: 'Prototype demo payment.', recordedAt: '2026-07-01T11:00:00.000Z' },
];

async function allSpecialistSlugs(): Promise<string[]> {
  const result = await specialists.all();
  return result.ok ? result.data.map((s) => s.slug) : [];
}

async function resolveAccess(scope: SubscriptionScope, specialistSlugs: string[]): Promise<string[]> {
  return scope === 'all' ? allSpecialistSlugs() : specialistSlugs;
}

function findSub(id: string): CustomerSubscription | undefined {
  return subscriptions.find((s) => s.id === id);
}

export const subscriptionsService = {
  // ── Plans (admin-configurable) ─────────────────────────────────────────────
  plans: {
    async list(): Promise<Result<SpecialistPlan[]>> {
      return ok(plans.filter((p) => p.status === 'active'));
    },
    async all(): Promise<Result<SpecialistPlan[]>> {
      return ok([...plans]);
    },
    async byId(id: string): Promise<Result<SpecialistPlan>> {
      const match = plans.find((p) => p.id === id);
      return match ? ok(match) : err({ code: 'not_found', message: 'Plan not found.' });
    },
    async create(input: { name: string; description: string; scope: SubscriptionScope; specialistSlugs: string[] }): Promise<Result<SpecialistPlan>> {
      if (!input.name.trim()) return err({ code: 'invalid', message: 'Give the plan a name.' });
      const plan: SpecialistPlan = {
        id: `plan_new_${++planCounter}`,
        name: input.name.trim(),
        description: input.description.trim(),
        scope: input.scope,
        specialistSlugs: input.scope === 'all' ? [] : input.specialistSlugs,
        priceLabel: 'Price on request',
        status: 'active',
      };
      plans.push(plan);
      return ok(plan);
    },
    async archive(id: string): Promise<Result<SpecialistPlan>> {
      const plan = plans.find((p) => p.id === id);
      if (!plan) return err({ code: 'not_found', message: 'Plan not found.' });
      plan.status = 'archived';
      return ok(plan);
    },
  },

  // ── Customer subscriptions ─────────────────────────────────────────────────
  async list(): Promise<Result<CustomerSubscription[]>> {
    return ok([...subscriptions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async byId(id: string): Promise<Result<CustomerSubscription>> {
    const match = findSub(id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Subscription not found.' });
  },
  async byMember(memberId: string): Promise<Result<CustomerSubscription[]>> {
    return ok(subscriptions.filter((s) => s.memberId === memberId));
  },
  /** Which specialist slugs a member can currently access (active subscriptions). */
  async memberAccess(memberId: string): Promise<Result<string[]>> {
    const active = subscriptions.filter((s) => s.memberId === memberId && (s.state === 'active' || s.state === 'trialing'));
    const slugs = new Set<string>();
    for (const sub of active) {
      const resolved = await resolveAccess(sub.scope, sub.specialistSlugs);
      resolved.forEach((slug) => slugs.add(slug));
    }
    return ok([...slugs]);
  },

  async create(input: { memberId: string; customerName: string; customerEmail: string; planId: string }): Promise<Result<CustomerSubscription>> {
    const plan = plans.find((p) => p.id === input.planId);
    if (!plan) return err({ code: 'not_found', message: 'Plan not found.' });
    const id = `sub_new_${++subCounter}`;
    const sub: CustomerSubscription = {
      id,
      memberId: input.memberId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      planId: plan.id,
      planName: plan.name,
      scope: plan.scope,
      specialistSlugs: await resolveAccess(plan.scope, plan.specialistSlugs),
      state: 'active',
      startedAt: nowIso().slice(0, 10),
      lastPaymentAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    subscriptions.unshift(sub);
    return ok(sub);
  },

  async changePlan(id: string, planId: string): Promise<Result<CustomerSubscription>> {
    const sub = findSub(id);
    if (!sub) return err({ code: 'not_found', message: 'Subscription not found.' });
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return err({ code: 'not_found', message: 'Plan not found.' });
    sub.planId = plan.id;
    sub.planName = plan.name;
    sub.scope = plan.scope;
    sub.specialistSlugs = await resolveAccess(plan.scope, plan.specialistSlugs);
    sub.state = 'active';
    sub.updatedAt = nowIso();
    return ok(sub);
  },
  async setState(id: string, state: SubscriptionState): Promise<Result<CustomerSubscription>> {
    const sub = findSub(id);
    if (!sub) return err({ code: 'not_found', message: 'Subscription not found.' });
    sub.state = state;
    sub.updatedAt = nowIso();
    return ok(sub);
  },
  async cancel(id: string): Promise<Result<CustomerSubscription>> {
    return subscriptionsService.setState(id, 'canceled');
  },
  async recordPayment(id: string, note: string): Promise<Result<ManualPayment>> {
    const sub = findSub(id);
    if (!sub) return err({ code: 'not_found', message: 'Subscription not found.' });
    const payment: ManualPayment = { id: `pay_new_${++payCounter}`, subscriptionId: id, amountLabel: 'Recorded manually', note: note.trim() || 'Manual payment.', recordedAt: nowIso() };
    payments.push(payment);
    sub.lastPaymentAt = nowIso().slice(0, 10);
    if (sub.state === 'past_due' || sub.state === 'incomplete') sub.state = 'active';
    sub.updatedAt = nowIso();
    return ok(payment);
  },
  async payments(subscriptionId: string): Promise<Result<ManualPayment[]>> {
    return ok(payments.filter((p) => p.subscriptionId === subscriptionId).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
  },

  /** Roll-up for analytics / admin dashboards. */
  async summary(): Promise<Result<{ total: number; active: number; trialing: number; pastDue: number; canceled: number }>> {
    return ok({
      total: subscriptions.length,
      active: subscriptions.filter((s) => s.state === 'active').length,
      trialing: subscriptions.filter((s) => s.state === 'trialing').length,
      pastDue: subscriptions.filter((s) => s.state === 'past_due' || s.state === 'incomplete').length,
      canceled: subscriptions.filter((s) => s.state === 'canceled').length,
    });
  },
};
