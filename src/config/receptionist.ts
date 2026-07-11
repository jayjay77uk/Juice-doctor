import { site } from '@/content/site';

/**
 * Receptionist configuration — REPLACEABLE MOCK / admin-configurable data.
 *
 * The rule-based recommendation is a stand-in only. NONE of the values here are
 * approved product rules: the confidence threshold, the consultation questions
 * and the routing map are placeholders that the client will define and that the
 * admin will edit. Production replaces `receptionist.consult()` with live AI
 * inference reading this same configuration — without changing the CRM or the
 * frontend.
 */

/** Prototype mock threshold. Below this the receptionist escalates instead of routing. Configurable. */
export const CONFIDENCE_THRESHOLD = 0.6;

export interface ReceptionistQuestion {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * Placeholder consultation script. Structure only — the actual questions are
 * supplied by the client and edited in admin.
 */
export const RECEPTIONIST_QUESTIONS: ReceptionistQuestion[] = [
  {
    id: 'q1',
    label: '[Consultation question 1 required]',
    options: [
      { value: 'opt-1', label: '[Option required]' },
      { value: 'opt-2', label: '[Option required]' },
      { value: 'opt-3', label: '[Option required]' },
      { value: 'opt-4', label: '[Option required]' },
    ],
  },
  {
    id: 'q2',
    label: '[Consultation question 2 required]',
    options: [
      { value: 'opt-1', label: '[Option required]' },
      { value: 'opt-2', label: '[Option required]' },
    ],
  },
];

/**
 * Placeholder routing: maps a q1 answer to one of the four specialist slugs.
 * The real routing rules are configured in admin.
 */
export const ROUTING_MAP: Record<string, string> = {
  'opt-1': 'specialist-ai-1',
  'opt-2': 'specialist-ai-2',
  'opt-3': 'specialist-ai-3',
  'opt-4': 'specialist-ai-4',
};

/**
 * The escalation target — configurable. Represents the client or an authorised
 * member of the client's team who reviews escalations, approves/changes the
 * recommended specialist, replies or takes over, and records the decision.
 */
export interface EscalationTarget {
  name: string;
  role: string;
  channel: 'in_app' | 'whatsapp' | 'email';
}

export const ESCALATION_TARGET: EscalationTarget = {
  name: site.founder.name, // default: the client — editable in admin
  role: 'Client',
  channel: 'whatsapp',
};
