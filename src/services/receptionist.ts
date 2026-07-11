import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { ReceptionistRecommendation, ConversationTurn, ConsultAnswer } from '@/types/crm';
import { DEFAULT_RECEPTIONIST_SETTINGS, type ReceptionistSettings } from '@/config/receptionist';
import { receptionistSettings } from './receptionist-settings';
import { agents } from './agents';
import { specialists } from './specialists';
import { ok, err, type Result } from './result';

/**
 * The Receptionist AI — the free front door. Its FUNCTION (receive → qualify →
 * summarise → recommend a specialist → create/update the CRM lead → escalate to
 * a human) is fixed; its behaviour is admin configuration (see
 * `receptionist-settings.ts`).
 *
 * `assess()` / `consult()` are REPLACEABLE MOCKS: deterministic stand-ins with no
 * approved business rules (no domain matching, no scoring). Production swaps the
 * bodies for live AI inference reading the same settings, with no change to the
 * CRM or the frontend.
 */

/** Deterministic pseudo-index from text (no Math.random — keeps output stable). */
function hashPick(text: string, mod: number): number {
  if (mod <= 0) return 0;
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100003;
  return h % mod;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

async function settingsOrDefault(): Promise<ReceptionistSettings> {
  const result = await receptionistSettings.get();
  return result.ok ? result.data : DEFAULT_RECEPTIONIST_SETTINGS;
}

export const receptionist = {
  /** The receptionist agent record (identity/prompt managed like any agent). */
  async agent(): Promise<Result<AiAgent>> {
    const result = await agents.list();
    const match = (result.ok ? result.data : []).find((a) => a.kind === 'receptionist');
    return match ? ok(match) : err({ code: 'not_found', message: 'Receptionist not configured.' });
  },

  /** Current admin-editable settings (greeting, questions, threshold, etc.). */
  async settings(): Promise<Result<ReceptionistSettings>> {
    return receptionistSettings.get();
  },

  /**
   * Produce a recommendation from the consultation answers. MOCK: deterministic
   * routing to one of the configured specialists with a placeholder confidence;
   * escalates below the configurable threshold. No approved rules are encoded.
   */
  async consult(answers: ConsultAnswer[]): Promise<Result<ReceptionistRecommendation>> {
    const settings = await settingsOrDefault();
    const all = await specialists.all();
    const list = all.ok ? all.data : [];

    const combined = answers.map((a) => a.answer).join(' ').trim();
    const answered = answers.filter((a) => a.answer.trim().length > 0).length;

    const chosen = list.length > 0 ? list[hashPick(combined || 'x', list.length)] : undefined;

    // Placeholder confidence — a stand-in only, not an approved rule.
    let confidence = answered >= settings.questions.length ? 0.72 : 0.5;
    if (combined.length < 8) confidence = 0.4;
    confidence = clamp(confidence, 0.2, 0.9);

    const escalate = !chosen || confidence < settings.confidenceThreshold;
    const alternatives = list
      .filter((s) => s.slug !== chosen?.slug)
      .slice(0, 2)
      .map((s) => ({ slug: s.slug, name: s.name }));

    return ok({
      specialistSlug: chosen?.slug ?? '',
      specialistName: chosen?.name ?? 'a specialist',
      confidence,
      reasoning: escalate
        ? `I could not confidently decide on the best match, so I have passed this to ${settings.escalationTarget.name} for review. (Prototype: replaceable mock.)`
        : `Based on what you told me, ${chosen?.name} looks like the best fit. (Prototype: replaceable mock — routing is admin-configurable.)`,
      escalate,
      alternativeSlug: alternatives[0]?.slug ?? null,
      alternatives,
    });
  },

  /**
   * Turn the conversation + answers into a structured summary + recommendation.
   * The summary is plain-English; the assessment keys use the question prompts so
   * the CRM reads naturally. MOCK — production replaces this with live inference.
   */
  async assess(input: {
    conversation: ConversationTurn[];
    answers: ConsultAnswer[];
  }): Promise<Result<{ summary: string; assessment: Record<string, string>; recommendation: ReceptionistRecommendation }>> {
    const recResult = await this.consult(input.answers);
    if (!recResult.ok) return recResult;
    const rec = recResult.data;

    const assessment: Record<string, string> = {};
    for (const a of input.answers) {
      if (a.answer.trim()) assessment[a.prompt] = a.answer.trim();
    }

    const lines = input.answers
      .filter((a) => a.answer.trim())
      .map((a) => `• ${a.prompt} ${a.answer.trim()}`);
    const outcome = rec.escalate
      ? `The receptionist was not confident enough to recommend an AI, so this has been marked for human review.`
      : `The receptionist suggested ${rec.specialistName} (confidence ${Math.round(rec.confidence * 100)}%).`;
    const summary = `${lines.join('\n')}\n\n${outcome}`.trim();

    return ok({ summary, assessment, recommendation: rec });
  },

  /** Business stats about the receptionist's performance (mock). */
  async stats(): Promise<Result<{ consultations30d: number; recommendationRate: number; escalationRate: number; avgConfidence: number }>> {
    return ok({ consultations30d: 0, recommendationRate: 0, escalationRate: 0, avgConfidence: 0 });
  },
};
