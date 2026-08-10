import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { ReceptionistRecommendation, ConversationTurn, ConsultAnswer } from '@/types/crm';
import { DEFAULT_RECEPTIONIST_SETTINGS, type ReceptionistSettings } from '@/config/receptionist';
import { getAiProvider } from '@/lib/ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseReceptionistResult, type ReceptionistResult } from '@/lib/ai/receptionist-schema';
import { receptionistSettings } from './receptionist-settings';
import { agents } from './agents';
import { specialists } from './specialists';
import { ok, err, type Result } from './result';

/**
 * The Receptionist AI — the free front door and the entry point of the routing
 * engine. Its FUNCTION (receive → qualify → recommend the single best specialist
 * → escalate to a human when unsure) is fixed; its behaviour is admin
 * configuration (see `receptionist-settings.ts`).
 *
 * `assess()` performs REAL reasoning through the provider-neutral AI adapter and
 * returns validated structured output. It can only recommend from the ACTIVE
 * specialist records — the model cannot invent one. When the AI provider is not
 * configured or the call fails, it NEVER fabricates a match: it escalates to the
 * configured human target with an honest reason.
 */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

async function settingsOrDefault(): Promise<ReceptionistSettings> {
  const result = await receptionistSettings.get();
  return result.ok ? result.data : DEFAULT_RECEPTIONIST_SETTINGS;
}

/** The specialists the receptionist may route to — active records only. */
async function activeSpecialists(): Promise<AiAgent[]> {
  const all = await specialists.all();
  return (all.ok ? all.data : []).filter((s) => s.status === 'active');
}

function answerLines(answers: ConsultAnswer[]): string {
  return answers
    .filter((a) => a.answer.trim())
    .map((a) => `• ${a.prompt} ${a.answer.trim()}`)
    .join('\n');
}

/** System prompt: the receptionist's role + the exact roster it may recommend. */
function buildSystemPrompt(settings: ReceptionistSettings, roster: AiAgent[]): string {
  const specialistLines = roster.length
    ? roster
        .map(
          (s) =>
            `- slug: ${s.slug}\n  name: ${s.name}\n  purpose: ${s.purpose || s.description}\n  handles: ${
              s.responseBoundaries || 'questions within its area of expertise'
            }`,
        )
        .join('\n')
    : '(no specialists are currently available)';

  return [
    'You are the AI Receptionist — the free front door for this business.',
    'Your job: understand what the visitor needs from the conversation, then recommend the SINGLE best specialist AI for them, or escalate to a human when you are not confident.',
    `Tone: ${settings.tone}.`,
    '',
    'The ONLY specialists you may recommend (use their exact slug):',
    specialistLines,
    '',
    'Rules:',
    '- Recommend ONLY from the slugs listed above. Never invent a specialist, a slug, or a capability.',
    '- Base your assessment strictly on what the visitor actually said. Do not assume facts they did not provide.',
    '- If no specialist is a good fit, or you are not confident, set escalationRequired to true and primaryRecommendation to null.',
    '- "confidence" is your genuine confidence (0..1) that the primary recommendation is correct.',
    '- You route; you do not advise. Do not give medical, legal or financial advice.',
    '- Be concise, warm and professional.',
    '',
    'Return a JSON object with exactly these fields:',
    "- summary: a short plain-English summary of the visitor's need (2-3 sentences).",
    '- identifiedNeeds: array of the needs you identified.',
    '- relevantFacts: array of concrete facts the visitor stated.',
    '- unansweredQuestions: array of questions you would still want answered.',
    '- recommendedSpecialistIds: array of specialist slugs you recommend (may be empty).',
    '- primaryRecommendation: the single best specialist slug, or null.',
    '- alternativeRecommendations: array of other candidate slugs.',
    '- confidence: number between 0 and 1.',
    '- escalationRequired: boolean.',
    '- escalationReason: string or null.',
    '- suggestedNextAction: one short sentence telling the visitor what happens next.',
  ].join('\n');
}

/** The consultation transcript given to the model as the user turn. */
function buildTranscript(conversation: ConversationTurn[], answers: ConsultAnswer[]): string {
  const convo = conversation.length
    ? `Conversation so far:\n${conversation
        .map((t) => `${t.role === 'visitor' ? 'Visitor' : 'Receptionist'}: ${t.text}`)
        .join('\n')}`
    : '';
  const qa = answers.filter((a) => a.answer.trim()).length
    ? `Structured answers:\n${answers
        .filter((a) => a.answer.trim())
        .map((a) => `Q: ${a.prompt}\nA: ${a.answer.trim()}`)
        .join('\n\n')}`
    : '';
  return [convo, qa, 'Assess this visitor and return the JSON object.'].filter(Boolean).join('\n\n');
}

/** Map validated model output onto the CRM recommendation, honouring the roster. */
function toRecommendation(
  result: ReceptionistResult,
  roster: AiAgent[],
  settings: ReceptionistSettings,
): ReceptionistRecommendation {
  const bySlug = new Map(roster.map((s) => [s.slug, s]));
  const primarySlug =
    result.primaryRecommendation && bySlug.has(result.primaryRecommendation)
      ? result.primaryRecommendation
      : null;
  const primary = primarySlug ? bySlug.get(primarySlug) : undefined;

  const alternatives = result.alternativeRecommendations
    .filter((slug) => slug !== primarySlug)
    .map((slug) => bySlug.get(slug))
    .filter((s): s is AiAgent => Boolean(s))
    .slice(0, 2)
    .map((s) => ({ slug: s.slug, name: s.name }));

  const confidence = clamp(result.confidence, 0, 1);
  const escalate = result.escalationRequired || !primary || confidence < settings.confidenceThreshold;

  const reasoning = escalate
    ? result.escalationReason?.trim() ||
      `I could not confidently decide on the best match, so I have passed this to ${settings.escalationTarget.name} to review.`
    : result.suggestedNextAction?.trim() ||
      `Based on what you told me, ${primary?.name ?? 'the recommended specialist'} looks like the best fit.`;

  return {
    specialistSlug: primary?.slug ?? '',
    specialistName: primary?.name ?? 'a specialist',
    confidence,
    reasoning,
    escalate,
    alternativeSlug: alternatives[0]?.slug ?? null,
    alternatives,
  };
}

/** Honest fallback when the AI is unavailable or errors — escalate, never fabricate. */
function unavailableRecommendation(settings: ReceptionistSettings): ReceptionistRecommendation {
  return {
    specialistSlug: '',
    specialistName: 'a specialist',
    confidence: 0,
    reasoning: `The AI receptionist is temporarily unavailable, so I have passed you to ${settings.escalationTarget.name} to help you directly.`,
    escalate: true,
    alternativeSlug: null,
    alternatives: [],
  };
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
   * Turn the conversation + answers into a structured summary + recommendation
   * via real AI reasoning. Recommends only from the active specialist roster;
   * escalates (honestly) when the AI is unavailable, errors, or is not confident.
   */
  async assess(input: {
    conversation: ConversationTurn[];
    answers: ConsultAnswer[];
  }): Promise<Result<{ summary: string; assessment: Record<string, string>; recommendation: ReceptionistRecommendation }>> {
    const settings = await settingsOrDefault();
    const roster = await activeSpecialists();

    const assessment: Record<string, string> = {};
    for (const a of input.answers) {
      if (a.answer.trim()) assessment[a.prompt] = a.answer.trim();
    }

    const provider = getAiProvider();
    if (!provider) {
      // No AI configured — escalate honestly rather than fabricate a match.
      const rec = unavailableRecommendation(settings);
      const summary = `${answerLines(input.answers)}\n\nOutcome: the AI receptionist is not available, so this was passed to ${settings.escalationTarget.name}.`.trim();
      return ok({ summary, assessment, recommendation: rec });
    }

    try {
      const result = await provider.structured(
        {
          system: buildSystemPrompt(settings, roster),
          messages: [{ role: 'user', content: buildTranscript(input.conversation, input.answers) }],
          maxTokens: 1024,
        },
        parseReceptionistResult,
      );

      const rec = toRecommendation(result, roster, settings);
      const outcome = rec.escalate
        ? `Outcome: passed to ${settings.escalationTarget.name} for review (confidence ${Math.round(rec.confidence * 100)}%).`
        : `Outcome: recommended ${rec.specialistName} (confidence ${Math.round(rec.confidence * 100)}%).`;
      const summary = `${result.summary.trim()}\n\n${outcome}`.trim();
      return ok({ summary, assessment, recommendation: rec });
    } catch {
      // Provider error — escalate honestly, never fabricate an answer.
      const rec = unavailableRecommendation(settings);
      const summary = `${answerLines(input.answers)}\n\nOutcome: the AI receptionist could not complete the assessment, so this was passed to ${settings.escalationTarget.name}.`.trim();
      return ok({ summary, assessment, recommendation: rec });
    }
  },

  /** Produce a recommendation from the consultation answers (delegates to assess). */
  async consult(answers: ConsultAnswer[]): Promise<Result<ReceptionistRecommendation>> {
    const result = await this.assess({ conversation: [], answers });
    if (!result.ok) return result;
    return ok(result.data.recommendation);
  },

  /**
   * Business stats about the receptionist's performance, computed from REAL
   * crm_leads rows (every receptionist consultation that captured a lead):
   * volume over 30 days, how often a confident recommendation was made vs a
   * human escalation, and the mean recommendation confidence.
   */
  async stats(): Promise<Result<{ consultations30d: number; recommendationRate: number; escalationRate: number; avgConfidence: number }>> {
    const sb = createAdminClient();
    if (!sb) return ok({ consultations30d: 0, recommendationRate: 0, escalationRate: 0, avgConfidence: 0 });
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data, error } = await sb
      .from('crm_leads')
      .select('recommended_specialist_slug, recommendation_confidence, escalated, created_at')
      .gte('created_at', since)
      .limit(1000);
    if (error) return ok({ consultations30d: 0, recommendationRate: 0, escalationRate: 0, avgConfidence: 0 });
    const rows = data ?? [];
    const total = rows.length;
    const recommended = rows.filter((r) => r.recommended_specialist_slug).length;
    const escalated = rows.filter((r) => r.escalated).length;
    const confidences = rows.map((r) => Number(r.recommendation_confidence)).filter((n) => Number.isFinite(n));
    return ok({
      consultations30d: total,
      recommendationRate: total ? recommended / total : 0,
      escalationRate: total ? escalated / total : 0,
      avgConfidence: confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
    });
  },
};
