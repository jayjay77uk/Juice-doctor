/**
 * Receptionist configuration — admin-editable DEFAULTS.
 *
 * These are the DEFAULT settings the admin edits from the Receptionist AI page.
 * NONE of them are approved product rules: the greeting, tone, consultation
 * questions, confidence threshold, escalation rule and WhatsApp settings are all
 * placeholders in clear English that the client will define and the admin will
 * edit at runtime (see `services/receptionist-settings.ts`).
 *
 * The recommendation logic that reads these values performs LIVE AI inference
 * (see `services/receptionist.ts`): the model assesses the visitor's answers,
 * may only recommend from the active specialist roster, and escalates to the
 * configured human target when confidence is low or the provider is unavailable.
 */

export interface ReceptionistQuickReply {
  value: string;
  label: string;
}

export interface ReceptionistQuestion {
  id: string;
  /** The question the receptionist asks (clear English placeholder). */
  prompt: string;
  /** Optional quick-reply chips. Free text is always allowed as well. */
  quickReplies: ReceptionistQuickReply[];
}

/**
 * The escalation target — configurable. Represents the client or an authorised
 * member of the client's team who reviews escalations, approves or changes the
 * recommendation, replies or takes over, and records the decision.
 */
export interface EscalationTarget {
  name: string;
  role: string;
  channel: 'in_app' | 'whatsapp' | 'email';
}

/** Everything the admin can manage for the Receptionist AI. */
export interface ReceptionistSettings {
  active: boolean;
  greeting: string;
  tone: string;
  questions: ReceptionistQuestion[];
  /** Below this (0..1) the receptionist escalates instead of recommending. */
  confidenceThreshold: number;
  escalationRule: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  escalationTarget: EscalationTarget;
}

export const DEFAULT_RECEPTIONIST_SETTINGS: ReceptionistSettings = {
  active: true,
  greeting:
    'Hello, and welcome — I am Makela, your wellbeing concierge. Tell me what you need help with and I will listen first, then guide you to the specialist best placed to help — or connect you with a member of the team.',
  tone: 'Warm, clear and professional',
  questions: [
    { id: 'q1', prompt: 'What would you like help with today?', quickReplies: [] },
    { id: 'q2', prompt: 'What outcome are you hoping for?', quickReplies: [] },
    {
      id: 'q3',
      prompt: 'How soon do you need help?',
      quickReplies: [
        { value: 'asap', label: 'As soon as possible' },
        { value: 'this-month', label: 'This month' },
        { value: 'exploring', label: 'Just exploring for now' },
      ],
    },
  ],
  confidenceThreshold: 0.6,
  escalationRule:
    'When confidence is below the threshold, hand the conversation to a member of the team instead of recommending an AI.',
  whatsappEnabled: true,
  whatsappNumber: '+44 0000 000000',
  escalationTarget: { name: 'Ask Juice Doctor AI Team', role: 'Client team', channel: 'whatsapp' },
};

/** Back-compat exports used by the CRM seed and the receptionist service. */
export const ESCALATION_TARGET: EscalationTarget = DEFAULT_RECEPTIONIST_SETTINGS.escalationTarget;
export const CONFIDENCE_THRESHOLD = DEFAULT_RECEPTIONIST_SETTINGS.confidenceThreshold;
