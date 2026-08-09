import 'server-only';

import type { BusinessSummary } from '@/types/crm';
import { specialists } from './specialists';
import { crm } from './crm';
import { receptionist } from './receptionist';
import { ok, type Result } from './result';

/**
 * Business roll-up for the admin AI-Business Dashboard. Aggregates specialists,
 * their subscriptions (MRR), CRM leads and receptionist performance into one
 * headline summary. All figures come from real rows (agents, subscriptions,
 * CRM leads, AI run logs).
 */
export const business = {
  async summary(): Promise<Result<BusinessSummary>> {
    const [specialistsResult, leadsResult, receptionistStats] = await Promise.all([
      specialists.all(),
      crm.list(),
      receptionist.stats(),
    ]);
    const specialistList = specialistsResult.ok ? specialistsResult.data : [];
    const leads = leadsResult.ok ? leadsResult.data : [];
    const rStats = receptionistStats.ok ? receptionistStats.data : { recommendationRate: 0, escalationRate: 0 };

    // Sum MRR + active subscribers across all specialists.
    let mrr = 0;
    let activeSubscribers = 0;
    let conversations = 0;
    for (const s of specialistList) {
      const a = await specialists.analytics(s.slug);
      if (a.ok) {
        mrr += a.data.mrr;
        activeSubscribers += a.data.activeSubscribers;
        conversations += a.data.conversations30d;
      }
    }

    return ok({
      specialists: specialistList.length,
      activeSubscribers,
      mrr,
      currency: 'GBP',
      leads30d: leads.length,
      recommendationRate: rStats.recommendationRate,
      escalationRate: rStats.escalationRate,
      conversations30d: conversations,
    });
  },
};
