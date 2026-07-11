import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { SpecialistSubscription, SpecialistAnalytics } from '@/types/crm';
import { agents } from './agents';
import { ok, err, type Result } from './result';

/**
 * Specialist AI service — treats specialist agents as SUBSCRIPTION PRODUCTS.
 * Each specialist is an agent (kind='specialist') with a commercial identity,
 * its own subscribers, customers and business analytics. Reuses the agents
 * service for the underlying config; adds the business layer on top. Prototype
 * data is mock; production reads ai_agents + specialist_subscriptions (0015).
 */

async function specialistList(): Promise<AiAgent[]> {
  const result = await agents.list();
  return (result.ok ? result.data : []).filter((a) => a.kind === 'specialist');
}

/** Deterministic pseudo-value from a slug (no Math.random). */
function seedFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 997;
  return h / 997;
}

const CUSTOMER_NAMES = ['Rachel Adeyemi', 'Tom Blake', 'Priya Shah', 'Marcus Cole', 'Ebony Clarke', 'Paulette Nkemdirim', 'Jordan Rivera', 'Leah Fraser'];

function subscriptionsFor(specialist: AiAgent): SpecialistSubscription[] {
  const seed = seedFromSlug(specialist.slug);
  const count = 3 + Math.round(seed * 5);
  // No invented pricing: priceAmount is a placeholder (0) until the client sets it.
  const mrrUnit = specialist.product?.priceAmount ?? 0;
  return Array.from({ length: count }, (_, i) => {
    const name = CUSTOMER_NAMES[(i + Math.round(seed * 7)) % CUSTOMER_NAMES.length] ?? 'Customer';
    const state = i % 5 === 0 ? 'trialing' : i % 7 === 0 ? 'past_due' : 'active';
    return {
      id: `sub_${specialist.slug}_${i}`,
      specialistSlug: specialist.slug,
      scope: 'single',
      customerName: name,
      customerEmail: `${name.split(' ')[0]?.toLowerCase()}@example.com`,
      state,
      mrr: mrrUnit,
      startedAt: '2026-06-15',
      plan: specialist.product?.priceLabel ?? '[Plan required]',
    } satisfies SpecialistSubscription;
  });
}

export const specialists = {
  /** Public catalogue — active, public specialist products. */
  async catalogue(): Promise<Result<AiAgent[]>> {
    const list = await specialistList();
    return ok(list.filter((a) => a.status === 'active' && a.visibility === 'public'));
  },
  /** All specialists (incl. drafts) — for admin. */
  async all(): Promise<Result<AiAgent[]>> {
    return ok(await specialistList());
  },
  async bySlug(slug: string): Promise<Result<AiAgent>> {
    const match = (await specialistList()).find((a) => a.slug === slug);
    return match ? ok(match) : err({ code: 'not_found', message: 'Specialist not found.' });
  },
  async byId(id: string): Promise<Result<AiAgent>> {
    const match = (await specialistList()).find((a) => a.id === id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Specialist not found.' });
  },
  async subscriptions(slug: string): Promise<Result<SpecialistSubscription[]>> {
    const match = (await specialistList()).find((a) => a.slug === slug);
    return match ? ok(subscriptionsFor(match)) : err({ code: 'not_found', message: 'Specialist not found.' });
  },
  async analytics(slug: string): Promise<Result<SpecialistAnalytics>> {
    const match = (await specialistList()).find((a) => a.slug === slug);
    if (!match) return err({ code: 'not_found', message: 'Specialist not found.' });
    const subs = subscriptionsFor(match);
    const active = subs.filter((s) => s.state === 'active').length;
    const seed = seedFromSlug(slug);
    return ok({
      subscribers: subs.length,
      activeSubscribers: active,
      mrr: subs.filter((s) => s.state !== 'canceled').reduce((sum, s) => sum + s.mrr, 0),
      conversations30d: 120 + Math.round(seed * 400),
      satisfaction: 0.84 + seed * 0.12,
      churnRate: 0.02 + seed * 0.05,
      avgResponseMs: 700 + Math.round(seed * 700),
    });
  },
};
