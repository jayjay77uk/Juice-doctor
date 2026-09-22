import { featureFlags } from './feature-flags';
import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { ReceptionistRecommendation, ConversationTurn, ConsultAnswer } from '@/types/crm';
import { DEFAULT_RECEPTIONIST_SETTINGS, type ReceptionistSettings } from '@/config/receptionist';
import { getAiProvider } from '@/lib/ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseReceptionistResult, type ReceptionistResult } from '@/lib/ai/receptionist-schema';
import { parseReceptionistTurnResult } from '@/lib/ai/receptionist-turn-schema';
import { precheckInput } from './herne/safety-eval';
import { runLogRepo } from './repositories/run-log-repo';
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

/** One conversational receptionist turn — what the console renders/acts on. */
export interface ReceptionistTurnResult {
  reply: string;
  action: 'continue' | 'recommend' | 'escalate';
  recommendation: ReceptionistRecommendation | null;
  /** Present when routing — the summary persisted onto the CRM lead. */
  summary: string | null;
  /** True when the safety layer answered instead of the model. */
  safetyBlocked: boolean;
}

/**
 * System prompt for the CONVERSATIONAL receptionist. The core rule: respond to
 * what the visitor actually said. The admin-configured intake questions are
 * supplied only as topics that may be useful WHEN RELEVANT — never a script.
 */
function buildTurnSystemPrompt(settings: ReceptionistSettings, roster: AiAgent[]): string {
  const specialistLines = roster.length
    ? roster
        .map((s) => `- slug: ${s.slug} | name: ${s.name} | helps with: ${s.purpose || s.description}`)
        .join('\n')
    : '(no specialists are currently available)';
  const topicLines = settings.questions.length
    ? settings.questions.map((q) => `- ${q.prompt}`).join('\n')
    : '(none configured)';

  return [
    'You are Makela, the wellbeing receptionist and concierge for this platform. You are the warm, intelligent front door — a real conversation, never a form.',
    `Tone: ${settings.tone}.`,
    '',
    'How you behave — UNDERSTAND → RESPOND → CLARIFY ONLY IF NECESSARY → ROUTE:',
    "- ALWAYS respond to what the visitor actually said. If they ask what you can do, ANSWER that question — describe how you listen, help them work out what they need, and connect them with the right specialist or a human team member. Never answer a question with an unrelated question.",
    '- Listen first. When someone shares a problem, acknowledge it genuinely before anything else. If someone just wants to be heard, be present — do not interrogate them.',
    '- Ask AT MOST one short clarifying question per turn, and only when you genuinely need it to help or route them. Never ask a question merely because it is on a list.',
    '- Keep replies natural and concise (usually 1-4 sentences). No bullet-point lectures in casual conversation.',
    '- You are a receptionist, not a clinician: never diagnose, never give medical/clinical advice, never claim to be a doctor or therapist. For support questions, describe what the specialists can explore with them instead.',
    '- Answer service questions from the REAL roster below — never invent specialists, capabilities or availability. Members of the human team can also help; a consultation can be booked through the site.',
    '',
    'The specialists (the ONLY ones that exist — use exact slugs when routing):',
    specialistLines,
    '',
    'Topics that are often useful to understand when relevant (guidance only — NEVER work through these as a script):',
    topicLines,
    '',
    'Routing:',
    "- When the visitor has shared a real need and you are confident which specialist fits, set action='recommend', primaryRecommendation to that slug, confidence to your genuine 0..1 confidence, and summary to a 2-3 sentence plain-English summary of their need. Your reply should say who you recommend and why in a natural way.",
    "- When a human team member is clearly more appropriate (they ask for a human, the situation is complex or sensitive beyond routing, or they are distressed and need personal contact), set action='escalate' with escalationReason and a summary. Your reply should warmly explain a member of the team will pick this up.",
    "- Otherwise set action='continue'. Simply having a conversation is a valid outcome.",
    '- Do not rush to route. One or two genuine exchanges are usually worth more than an early guess. Never route before the visitor has actually described a need.',
    '',
    'Return ONLY a JSON object: { "reply": string, "action": "continue"|"recommend"|"escalate", "primaryRecommendation": string|null, "alternativeRecommendations": string[], "confidence": number, "summary": string|null, "escalationReason": string|null }',
  ].join('\n');
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
   * ONE conversational turn — the engine behind the ChatGPT-style console.
   * Safety precheck runs BEFORE any inference (emergency/self-harm wording is
   * answered by the safety layer and escalated, never by the model). Replies
   * are grounded in the real roster; routing happens only when the model is
   * genuinely confident, and low-confidence routing degrades to continuing
   * the conversation rather than guessing. Never fabricates when the provider
   * is unavailable — it says so and hands over to the human team.
   */
  async turn(input: { conversation: ConversationTurn[] }): Promise<Result<ReceptionistTurnResult>> {
    const settings = await settingsOrDefault();
    const roster = await activeSpecialists();
    const lastVisitor = [...input.conversation].reverse().find((t) => t.role === 'visitor');

    // Safety first — the fixed floor answers emergencies, not the model.
    const safety = precheckInput(lastVisitor?.text ?? '');
    if (safety.blocked && safety.userMessage) {
      void runLogRepo.log({ agentId: null, input: (lastVisitor?.text ?? '').slice(0, 500), output: '', status: 'blocked' });
      return ok({
        reply: safety.userMessage,
        action: 'escalate',
        recommendation: {
          specialistSlug: '', specialistName: 'a specialist', confidence: 0,
          reasoning: `Safety escalation (${safety.category}) — a member of the team should review this conversation.`,
          escalate: true, alternativeSlug: null, alternatives: [],
        },
        summary: `Safety escalation: the visitor's message triggered the ${safety.category} safety pathway. The safety wording was shown and the conversation was passed to ${settings.escalationTarget.name}.`,
        safetyBlocked: true,
      });
    }

    const provider = await featureFlags.isEnabled('ai.chat') ? getAiProvider() : null;
    if (!provider) {
      const rec = unavailableRecommendation(settings);
      return ok({
        reply: `I'm sorry — I'm not able to chat right now. I've passed this to ${settings.escalationTarget.name}; please leave your details and a member of the team will get back to you.`,
        action: 'escalate',
        recommendation: rec,
        summary: 'The AI receptionist was unavailable; the visitor was passed to the human team.',
        safetyBlocked: false,
      });
    }

    const transcript = input.conversation
      .map((t) => `${t.role === 'visitor' ? 'Visitor' : 'Makela'}: ${t.text}`)
      .join('\n');
    const started = Date.now();
    try {
      const result = await provider.structured(
        {
          system: buildTurnSystemPrompt(settings, roster),
          messages: [{ role: 'user', content: `Conversation so far:\n${transcript}\n\nRespond to the visitor's last message and return the JSON object.` }],
          maxTokens: 700,
        },
        parseReceptionistTurnResult,
      );

      // Roster + threshold enforcement — the model cannot invent a specialist,
      // and an under-confident recommendation keeps the conversation going.
      const bySlug = new Map(roster.map((s) => [s.slug, s]));
      let action = result.action;
      const primary = result.primaryRecommendation ? bySlug.get(result.primaryRecommendation) : undefined;
      if (action === 'recommend' && (!primary || clamp(result.confidence, 0, 1) < settings.confidenceThreshold)) {
        action = 'continue';
      }

      let recommendation: ReceptionistRecommendation | null = null;
      let summary: string | null = null;
      if (action === 'recommend' && primary) {
        const alternatives = result.alternativeRecommendations
          .filter((slug) => slug !== primary.slug)
          .map((slug) => bySlug.get(slug))
          .filter((s): s is AiAgent => Boolean(s))
          .slice(0, 2)
          .map((s) => ({ slug: s.slug, name: s.name }));
        recommendation = {
          specialistSlug: primary.slug,
          specialistName: primary.name,
          confidence: clamp(result.confidence, 0, 1),
          reasoning: result.summary?.trim() || `Recommended from the conversation.`,
          escalate: false,
          alternativeSlug: alternatives[0]?.slug ?? null,
          alternatives,
        };
        summary = `${(result.summary ?? '').trim()}\n\nOutcome: recommended ${primary.name} (confidence ${Math.round(clamp(result.confidence, 0, 1) * 100)}%).`.trim();
      } else if (action === 'escalate') {
        recommendation = {
          specialistSlug: '', specialistName: 'a specialist', confidence: clamp(result.confidence, 0, 1),
          reasoning: result.escalationReason?.trim() || `Passed to ${settings.escalationTarget.name} to review.`,
          escalate: true, alternativeSlug: null, alternatives: [],
        };
        summary = `${(result.summary ?? '').trim()}\n\nOutcome: passed to ${settings.escalationTarget.name} for review.`.trim();
      }

      void runLogRepo.log({
        agentId: null,
        input: (lastVisitor?.text ?? '').slice(0, 500),
        output: result.reply.slice(0, 1000),
        latencyMs: Date.now() - started,
        status: 'ok',
      });
      return ok({ reply: result.reply, action, recommendation, summary, safetyBlocked: false });
    } catch {
      void runLogRepo.log({ agentId: null, input: (lastVisitor?.text ?? '').slice(0, 500), output: '', latencyMs: Date.now() - started, status: 'error' });
      const rec = unavailableRecommendation(settings);
      return ok({
        reply: `I'm sorry — I couldn't respond just then. I've let ${settings.escalationTarget.name} know; you can leave your details and a member of the team will get back to you, or try again in a moment.`,
        action: 'escalate',
        recommendation: rec,
        summary: 'The AI receptionist errored mid-conversation; the visitor was passed to the human team.',
        safetyBlocked: false,
      });
    }
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

    const provider = await featureFlags.isEnabled('ai.chat') ? getAiProvider() : null;
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
    // Surface query failures — the dashboard renders "—" for an error, which
    // must stay distinguishable from a true zero.
    if (error) return err({ code: 'unavailable', message: 'Could not load receptionist statistics.' });
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
