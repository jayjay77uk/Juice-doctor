import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { ReceptionistRecommendation } from '@/types/crm';
import { agents } from './agents';
import { specialists } from './specialists';
import { ok, err, type Result } from './result';

/**
 * The Receptionist AI — the single front door of the business. It consults every
 * visitor, qualifies them, recommends the best specialist AI with a confidence
 * score, and escalates to a human expert when confidence is low. Prototype logic
 * is deterministic and rule-based (no inference); production replaces `consult()`
 * with a real model call. The routing rules and threshold are CONFIGURABLE data.
 */

/** Below this confidence the receptionist escalates to a human instead of routing. */
export const CONFIDENCE_THRESHOLD = 0.6;

export interface ReceptionistQuestion {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

/** The consultation script — data, editable in admin in production. */
export const RECEPTIONIST_QUESTIONS: ReceptionistQuestion[] = [
  {
    id: 'goal',
    label: 'What would you most like to improve?',
    options: [
      { value: 'hydration', label: 'Energy & hydration' },
      { value: 'nutrition', label: 'The way I eat' },
      { value: 'sleep', label: 'My sleep' },
      { value: 'movement', label: 'Moving more' },
      { value: 'everything', label: 'A full reset' },
    ],
  },
  {
    id: 'concern',
    label: 'Is anything specific troubling you?',
    options: [
      { value: 'tired', label: 'I feel tired a lot' },
      { value: 'cravings', label: 'Cravings / appetite' },
      { value: 'focus', label: 'Focus & clarity' },
      { value: 'pain', label: 'Persistent pain or a symptom' },
      { value: 'none', label: 'Nothing specific' },
    ],
  },
  {
    id: 'commitment',
    label: 'How ready are you to start?',
    options: [
      { value: 'now', label: 'Ready now' },
      { value: 'soon', label: 'Soon' },
      { value: 'exploring', label: 'Just exploring' },
    ],
  },
];

const GOAL_TO_SPECIALIST: Record<string, string> = {
  hydration: 'hydration-specialist',
  nutrition: 'nutrition-specialist',
  sleep: 'sleep-specialist',
  movement: 'movement-specialist',
  everything: 'wellbeing-companion',
};

// Concerns that must go to a human, not an AI specialist.
const RED_FLAGS = new Set(['pain']);

export const receptionist = {
  /** The receptionist agent record (its identity/prompt/etc. are managed like any agent). */
  async agent(): Promise<Result<AiAgent>> {
    const result = await agents.list();
    const match = (result.ok ? result.data : []).find((a) => a.kind === 'receptionist');
    return match ? ok(match) : err({ code: 'not_found', message: 'Receptionist not configured.' });
  },

  questions: RECEPTIONIST_QUESTIONS,

  /** Produce a recommendation from consultation answers (mock, rule-based). */
  async consult(answers: Record<string, string>): Promise<Result<ReceptionistRecommendation>> {
    const goal = answers.goal ?? 'everything';
    const concern = answers.concern ?? 'none';
    const commitment = answers.commitment ?? 'exploring';

    const redFlag = RED_FLAGS.has(concern);
    const slug = GOAL_TO_SPECIALIST[goal] ?? 'wellbeing-companion';

    // Confidence: strong when the goal is clear, weaker when "exploring", and
    // driven to zero by a red-flag symptom (which forces escalation).
    let confidence = 0.9;
    if (goal === 'everything') confidence = 0.78;
    if (commitment === 'exploring') confidence -= 0.15;
    if (concern === 'none') confidence -= 0.03;
    if (redFlag) confidence = 0.3;
    confidence = Math.max(0.2, Math.min(0.96, confidence));

    const escalate = redFlag || confidence < CONFIDENCE_THRESHOLD;

    const catalogue = await specialists.catalogue();
    const name =
      (catalogue.ok ? catalogue.data : []).find((s) => s.slug === slug)?.name ?? 'a specialist';

    const reasoning = redFlag
      ? 'A specific symptom was mentioned, so I’m routing this to our human expert rather than an AI specialist.'
      : `Based on the goal of "${goal}"${commitment === 'exploring' ? ' (still exploring)' : ''}, ${name} is the strongest fit.`;

    return ok({
      specialistSlug: slug,
      specialistName: name,
      confidence,
      reasoning,
      escalate,
      alternativeSlug: goal === 'everything' ? null : 'wellbeing-companion',
    });
  },

  /** Business stats about the receptionist's performance (mock). */
  async stats(): Promise<Result<{ consultations30d: number; recommendationRate: number; escalationRate: number; avgConfidence: number }>> {
    return ok({ consultations30d: 428, recommendationRate: 0.82, escalationRate: 0.11, avgConfidence: 0.84 });
  },
};
