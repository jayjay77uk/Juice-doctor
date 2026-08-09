import 'server-only';

import { crmRepo } from './repositories/crm-repo';

/**
 * AI-centric CRM — the operational core. Every lead is created by the
 * Receptionist AI and records the full conversation, the consultation summary,
 * the recommendation + confidence, alternative matches, the assigned specialist,
 * human-review / WhatsApp / subscription / follow-up status, progress, notes, a
 * responsible team member and an activity timeline.
 *
 * PRODUCTION: crm_leads + crm_lead_events (migrations 0015 + 0026) — real rows,
 * real events. No mock data. Without a database connection the repository
 * returns honest unavailable results and pages render their empty states.
 */

export const crm = crmRepo;
