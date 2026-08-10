import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { ChatMessage, AiUsage } from '@/lib/ai';
import { getAiProvider } from '@/lib/ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';
import { retrieveForSpecialist, type HerneRetrieved } from './retrieval';
import { herneProfile, type HerneSpecialistProfile } from '@/data/herne/specialist-profiles';
import { HERNE_SHARED_DNA } from '@/data/herne/specialist-content';
import { teamRosterFor, HERNE_INSTITUTION_CONTEXT, HERNE_COMMUNICATION_VOICE } from '@/data/herne/team';
import { runLogRepo } from '../repositories/run-log-repo';
import { memoryRepo, extractMemory, type MemoryItem } from '../repositories/memory-repo';
import { languageDirective, HERNE_DEFAULT_PREFERENCE, type LanguagePreference } from './language';
import { getLanguagePreferenceFor } from './language-store';
import { carePlan, timeline, type CarePlan, type CarePlanAction, type TimelineEvent } from './care-plan';
import { buildWearableContext, type WearableContext } from './wearable/store';
import { referralRules, escalationEngine, referralEngine, type ReferralRule } from './referrals';
import { normalizeSpecialistRef, isWildcardRef } from './referral-matrix';
import { windowHistory } from '@/lib/ai/history';
import { activePrompt, type ActivePrompt } from './prompt-version';
import { precheckInput, postcheckOutput, type SafetyCategory } from './safety-eval';
import { isMemoryEnabled } from '../memory-prefs';

/**
 * The differentiated HERNE specialist turn — the platform is the intelligence
 * layer; Claude is the language/reasoning provider. Every live request assembles
 * the shared DNA, the specialist profile + consultation style, the active published
 * prompt version, the specialist output format, the user objective, the shared care
 * plan, permitted memory, ranked shared evidence with citations, permitted wearable
 * trends, the language preference, referral boundaries, safety rules and prototype
 * restrictions. Safety runs BEFORE (emergency/medication/diagnosis) and AFTER
 * (fabricated-citation stripping, unsupported-claim flagging) inference. Never
 * fabricates: honest unavailable states, evidence-only answers, real escalations.
 */

export interface HerneReply {
  text: string;
  specialist: string;
  citations: { recordId: string; sourceTitle: string; sourceUrl: string }[];
  retrieved: HerneRetrieved[];
  grounded: boolean;
  available: boolean;
  escalationRecommended: boolean;
  escalationReason: string | null;
  /** The resolved language the specialist was asked to answer in (BCP-47 code). */
  language: string;
  // ── Increment K telemetry + governance ─────────────────────────────────────
  usage: AiUsage | null;
  costUsd: number;
  latencyMs: number;
  traceId: string | null;
  model: string | null;
  promptVersion: { id: string; version: number; status: string } | null;
  safety: { category: SafetyCategory; blocked: boolean; issues: string[] };
  referralSuggestion: { toRole: string; reason: string; urgency: string } | null;
}

/** Resolve the language preference: explicit ctx wins, else the person's saved one. */
async function resolvePreference(ctx?: { userId?: string | null; language?: LanguagePreference }): Promise<LanguagePreference> {
  if (ctx?.language) return ctx.language;
  if (ctx?.userId) return getLanguagePreferenceFor(ctx.userId);
  return HERNE_DEFAULT_PREFERENCE;
}

/** Read the org shared DNA (admin-editable) with a bundled fallback. */
async function sharedDna(): Promise<string[]> {
  const sb = createAdminClient();
  if (!sb) return HERNE_SHARED_DNA;
  const { data } = await sb.from('system_settings').select('value').eq('organisation_id', HERNE_ORG).eq('key', 'herne_shared_dna').maybeSingle();
  const value = data?.value as { dna?: unknown } | null;
  return Array.isArray(value?.dna) ? (value?.dna as string[]) : HERNE_SHARED_DNA;
}

const PROTOTYPE_RESTRICTIONS =
  'PROTOTYPE RESTRICTIONS — This is a demonstration prototype. You provide general wellbeing support, not medical diagnosis or treatment. Your answers are AI-generated and not yet reviewed by a healthcare professional. No real patient records are used; any wearable data is simulated. For anything clinical, uncertain, or urgent, recommend a qualified healthcare professional.';

interface AssemblyInput {
  profile: HerneSpecialistProfile;
  dna: string[];
  retrieved: HerneRetrieved[];
  langDirective: string | null;
  starter: string;
  objective: string | null;
  plan: CarePlan | null;
  planActions: CarePlanAction[];
  wearable: WearableContext | null;
  referralBoundaries: ReferralRule[];
  journey: TimelineEvent[];
}

function assembleSystemPrompt(a: AssemblyInput): string {
  const { profile, dna, retrieved } = a;
  const evidenceBlock = retrieved.length
    ? retrieved
        .map(
          (r) =>
            `[${r.recordId}] (evidence: ${r.evidenceStrength || 'unstated'}) ${r.claim}\n${r.documentText}\nSource: ${r.sourceTitle}${r.sourceUrl ? ` — ${r.sourceUrl}` : ''}`,
        )
        .join('\n\n')
    : '(no approved evidence records matched this question)';

  const carePlanBlock = a.plan
    ? [
        'SHARED CARE PLAN — the ONE plan this person shares across the whole team. Build on it; never restart it.',
        a.plan.goals.length ? `Goals: ${a.plan.goals.join('; ')}` : null,
        a.plan.concerns.length ? `Concerns: ${a.plan.concerns.join('; ')}` : null,
        a.plan.hernePriorities.length ? `HERNE priorities: ${a.plan.hernePriorities.join(', ')}` : null,
        a.plan.assignedSpecialists.length ? `Contributing specialists: ${a.plan.assignedSpecialists.join(', ')}` : null,
        a.planActions.length ? `Existing recommendations (do not duplicate):\n${a.planActions.slice(0, 8).map((x) => `- (${x.specialist}, ${x.status}) ${x.title}`).join('\n')}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : null;

  const wearableBlock =
    a.wearable && a.wearable.consent && a.wearable.metrics.length
      ? [
          'WEARABLE TRENDS — consented, permitted, minimised trends only (never raw history, never a diagnosis).',
          ...a.wearable.metrics.map((m) => `- ${m.name}: ${m.direction} vs baseline (avg ${m.average}, deviation ${m.deviation}, confidence ${m.confidence}). ${m.limitations}`),
          a.wearable.limitations,
        ].join('\n')
      : null;

  const referralBlock = a.referralBoundaries.length
    ? [
        'REFERRAL BOUNDARIES — when a concern is better served elsewhere, hand off (do not overstep your scope):',
        ...a.referralBoundaries.map((r) => `- ${r.trigger} → ${r.isHumanEscalation ? `${r.toSpecialist} (human)` : r.toSpecialist}${r.urgency ? ` [${r.urgency}]` : ''}`),
      ].join('\n')
    : null;

  const journeyBlock = a.journey.length
    ? [
        'RECENT JOURNEY — what has already happened for this person, so you have the context and they do not repeat themselves:',
        ...a.journey.slice(0, 5).map((e) => `- ${e.title}${e.specialist ? ` (${e.specialist})` : ''}${e.detail ? ` — ${e.detail}` : ''}`),
      ].join('\n')
    : null;

  return [
    'You are part of the HERNE wellbeing concierge — a coordinated team of specialists that interpret ONE shared approved evidence base.',
    HERNE_INSTITUTION_CONTEXT,
    `SHARED DNA (every specialist upholds these):\n${dna.map((d) => `- ${d}`).join('\n')}`,
    `YOUR ROLE\nYou are ${profile.name}, ${profile.title}.\nConsultation principle: ${profile.principle}\n${profile.philosophy ? `Philosophy: ${profile.philosophy}` : 'Philosophy: (no approved philosophy yet — do not invent one)'}\nCommunication style: ${profile.tone}.\nYou MAY: ${profile.allowedActions}.\nYou MUST NOT: ${profile.mustNotDo}.\nReferral style: ${profile.referralStyle}.`,
    teamRosterFor(profile.specialistId),
    HERNE_COMMUNICATION_VOICE,
    `STARTER INSTRUCTIONS\n${a.starter}`,
    a.objective ? `USER OBJECTIVE — what this person wants from this conversation:\n${a.objective}` : null,
    carePlanBlock,
    journeyBlock,
    `SHARED EVIDENCE — answer using ONLY these approved records and cite each you use as [RECORD-ID]. Include evidence strength, limitations and source where relevant. Never contradict this evidence or invent facts, figures, clinical claims, or citations.\n\n${evidenceBlock}`,
    wearableBlock,
    `OUTPUT FORMAT — let these sections guide a helpful, complete answer as ${profile.name} (a natural guide, not a rigid template):\n${profile.outputFormat.map((s) => `- ${s}`).join('\n')}`,
    a.langDirective,
    referralBlock,
    'SAFETY — do not diagnose, prescribe, or advise stopping or changing medication. If the person reports alarm symptoms (e.g. severe or chest pain, fainting, blood in stool, pregnancy concerns, medication interactions, self-harm), recommend appropriate professional assessment and stop routine coaching.',
    PROTOTYPE_RESTRICTIONS,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function unavailable(specialistName: string, language: string, providerPresent: boolean): HerneReply {
  return {
    text: `I'm sorry — ${specialistName} is temporarily unavailable. Please try again shortly, or I can connect you with a member of the team.`,
    specialist: specialistName,
    citations: [], retrieved: [], grounded: false, available: providerPresent,
    escalationRecommended: false, escalationReason: null, language,
    usage: null, costUsd: 0, latencyMs: 0, traceId: null, model: null,
    promptVersion: null, safety: { category: 'none', blocked: false, issues: [] }, referralSuggestion: null,
  };
}

/** Best-effort escalation write — never blocks the user response. */
async function tryEscalate(input: {
  userId?: string | null | undefined;
  conversationId?: string | null | undefined;
  trigger: 'emergency' | 'clinical_review' | 'human_review' | 'outside_scope';
  reason: string;
  specialist: string;
  urgency?: string | null | undefined;
}): Promise<void> {
  if (!input.userId && !input.conversationId) return;
  try {
    await escalationEngine.escalate({
      userId: input.userId ?? null,
      conversationId: input.conversationId ?? null,
      trigger: input.trigger,
      reason: input.reason,
      specialist: input.specialist,
      destination: 'human clinical review',
      ...(input.urgency ? { urgency: input.urgency } : {}),
    });
  } catch {
    // best-effort
  }
}

export type HerneStreamChunk = { type: 'delta'; text: string } | { type: 'final'; reply: HerneReply };

interface HerneCtx { userId?: string | null; conversationId?: string | null; goal?: string; language?: LanguagePreference; signal?: AbortSignal }

interface PreparedTurn {
  kind: 'ready';
  provider: NonNullable<ReturnType<typeof getAiProvider>>;
  system: string;
  messages: ChatMessage[];
  retrieved: HerneRetrieved[];
  activeVer: ActivePrompt | null;
  pre: ReturnType<typeof precheckInput>;
  pref: LanguagePreference;
  profile: HerneSpecialistProfile;
  specialistName: string;
  started: number;
  rules: ReferralRule[];
}

/**
 * Assemble everything up to (but not including) the provider call — safety
 * pre-check, retrieval, care plan, wearable, prompt version, referral boundaries,
 * memory, language. Returns a blocked HerneReply (emergency/self-harm) OR a ready
 * turn shared by the non-streaming and streaming paths.
 */
async function prepareTurn(agent: AiAgent, history: ChatMessage[], query: string, ctx?: HerneCtx): Promise<{ kind: 'blocked'; reply: HerneReply } | PreparedTurn> {
  const profile = herneProfile(agent.slug);
  const provider = getAiProvider();
  const specialistName = profile?.name ?? agent.name;
  const pref = await resolvePreference(ctx);

  if (!profile || !provider) return { kind: 'blocked', reply: unavailable(specialistName, pref.language, Boolean(provider)) };

  const pre = precheckInput(query);
  if (pre.blocked) {
    await tryEscalate({ userId: ctx?.userId, conversationId: ctx?.conversationId, trigger: pre.trigger ?? 'emergency', reason: pre.reason ?? 'Safety pre-check', specialist: agent.slug, urgency: pre.urgency });
    await runLogRepo.log({ agentId: agent.id, actorId: ctx?.userId ?? null, input: query, output: pre.userMessage ?? '', status: 'blocked' });
    return {
      kind: 'blocked',
      reply: {
        text: pre.userMessage ?? 'For your safety, please seek urgent professional help.',
        specialist: specialistName,
        citations: [], retrieved: [], grounded: false, available: true,
        escalationRecommended: true, escalationReason: pre.reason, language: pref.language,
        usage: null, costUsd: 0, latencyMs: 0, traceId: null, model: null,
        promptVersion: null,
        safety: { category: pre.category, blocked: true, issues: [] },
        referralSuggestion: { toRole: 'human clinical review', reason: pre.reason ?? 'Urgent safety concern', urgency: pre.urgency ?? 'immediate' },
      },
    };
  }

  const started = Date.now();
  const [retrieved, memory, dna, plan, wearable, active, rules, journey] = await Promise.all([
    retrieveForSpecialist(agent.slug, query, ctx?.goal ? { goal: ctx.goal } : {}),
    ctx?.userId || ctx?.conversationId
      ? memoryRepo.recall({ userId: ctx?.userId ?? null, conversationId: ctx?.conversationId ?? null, limit: 6 })
      : Promise.resolve([] as MemoryItem[]),
    sharedDna(),
    ctx?.userId ? carePlan.get(ctx.userId) : Promise.resolve<CarePlan | null>(null),
    ctx?.userId ? buildWearableContext(agent.slug, ctx.userId) : Promise.resolve<WearableContext | null>(null),
    activePrompt(agent.id),
    referralRules.list(),
    ctx?.userId ? timeline.list(ctx.userId, 5) : Promise.resolve<TimelineEvent[]>([]),
  ]);

  const planActions = plan ? await carePlan.actions(plan.id) : [];
  const objective = ctx?.goal ?? (plan?.goals.length ? plan.goals.join('; ') : null);
  // Rules are seeded with display names ('Aqua') while agent identity is the
  // slug ('aqua') — normalise before comparing, and include wildcard ('Any')
  // rules such as the emergency escalation that applies to every specialist.
  const referralBoundaries = rules.filter(
    (r) => isWildcardRef(r.fromSpecialist) || normalizeSpecialistRef(r.fromSpecialist) === agent.slug,
  );

  const system =
    assembleSystemPrompt({
      profile, dna, retrieved,
      langDirective: languageDirective(pref),
      starter: active?.content ?? profile.starterPrompt,
      objective, plan, planActions, wearable, referralBoundaries, journey,
    }) +
    (memory.length ? `\n\nWHAT YOU REMEMBER ABOUT THIS PERSON (respect it):\n${memory.map((m) => `- ${m.content}`).join('\n')}` : '');

  // windowHistory trims a leading assistant turn — the API 400s on one.
  const messages: ChatMessage[] = [...windowHistory(history, 8), { role: 'user', content: query }];
  return { kind: 'ready', provider, system, messages, retrieved, activeVer: active, pre, pref, profile, specialistName, started, rules };
}

interface RawResult { text: string; usage: AiUsage | null; model: string | null; costUsd: number; latencyMs: number; traceId: string | null; stopReason: string | null }

/** Handoff-intent language that must accompany a colleague's name. */
const REFERRAL_INTENT =
  /\b(introduc\w*|recommend\w*|connect(?:ing)? you|speak (?:with|to)|talk (?:with|to)|chat (?:with|to)|hand(?:ing)? (?:you )?(?:over|off)|refer\w*|colleague|bring in|loop in|pass you|better placed|right person|reach out to)\b/i;

/**
 * Detect a colleague handoff in the reply: a referral-matrix rule from this
 * specialist whose named target is introduced WITH handoff intent. Deliberately
 * strict — the reply text is model output, so a bare name mention must never
 * trigger a database write: the CAPITALISED display name (several names are
 * common nouns — "sage advice" must not match) and an intent phrase must occur
 * in the SAME sentence. Wildcard targets and human escalations are excluded
 * (humans are handled by the escalation engine).
 */
function detectColleagueReferral(
  slug: string,
  text: string,
  rules: ReferralRule[],
): { toSlug: string; toName: string; rule: ReferralRule } | null {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  for (const rule of rules) {
    if (rule.isHumanEscalation || isWildcardRef(rule.toSpecialist)) continue;
    if (!(isWildcardRef(rule.fromSpecialist) || normalizeSpecialistRef(rule.fromSpecialist) === slug)) continue;
    const toSlug = normalizeSpecialistRef(rule.toSpecialist);
    const toProfile = herneProfile(toSlug);
    if (!toProfile || toSlug === slug) continue;
    const nameRe = new RegExp(`\\b${toProfile.name}\\b`); // case-sensitive
    if (sentences.some((s) => nameRe.test(s) && REFERRAL_INTENT.test(s))) {
      return { toSlug, toName: toProfile.name, rule };
    }
  }
  return null;
}

/** Shared post-inference finalisation: post-check, logging, escalation, referral, memory, reply. */
async function finalizeTurn(t: PreparedTurn, agent: AiAgent, query: string, ctx: HerneCtx | undefined, raw: RawResult): Promise<HerneReply> {
  const { retrieved, activeVer, pre, pref, specialistName } = t;
  const post = postcheckOutput(raw.text.trim(), retrieved.map((r) => r.recordId));
  // stopReason handling: a max_tokens cut-off must not read as a finished
  // answer, and a refusal must never surface as empty text.
  if (raw.stopReason === 'max_tokens') {
    post.text = `${post.text}\n\n(I had to pause there — say “continue” and I’ll pick up exactly where I left off.)`;
  } else if (raw.stopReason === 'refusal' && !post.text.trim()) {
    post.text = 'I’m sorry — I can’t help with that particular request. If it concerns your wellbeing, I can connect you with a member of our human team.';
  }
  const citations = retrieved.map((r) => ({ recordId: r.recordId, sourceTitle: r.sourceTitle, sourceUrl: r.sourceUrl }));

  await runLogRepo.log({
    agentId: agent.id,
    actorId: ctx?.userId ?? null,
    input: query,
    output: post.text,
    retrieved: retrieved.map((r) => ({ recordId: r.recordId, final: r.score.final, role: r.role })),
    tokensInput: raw.usage?.inputTokens ?? null,
    tokensOutput: raw.usage?.outputTokens ?? null,
    latencyMs: Date.now() - t.started,
    status: post.ok ? 'ok' : 'flagged',
    model: raw.model,
    costUsd: raw.costUsd,
    traceId: raw.traceId,
    promptVersionId: activeVer?.versionId ?? null,
  });

  let referralSuggestion: HerneReply['referralSuggestion'] = null;
  if (pre.escalate || post.mustEscalate) {
    const reason = pre.reason ?? 'Response required unsupported-claim review.';
    await tryEscalate({ userId: ctx?.userId, conversationId: ctx?.conversationId, trigger: pre.trigger ?? 'clinical_review', reason, specialist: agent.slug, urgency: pre.urgency });
    referralSuggestion = { toRole: 'human clinical review', reason, urgency: pre.urgency ?? 'routine' };
  }

  // Live specialist-to-specialist referral: when the reply introduces a
  // colleague covered by a matrix rule, record the real referral (herne_referrals
  // + care plan + timeline) so the receiving specialist has the full context.
  // Best-effort — a referral write must never block the user's answer.
  if (!referralSuggestion && ctx?.userId) {
    const detected = detectColleagueReferral(agent.slug, post.text, t.rules);
    if (detected) {
      try {
        await referralEngine.refer({
          userId: ctx.userId,
          fromSpecialist: agent.slug,
          toSpecialist: detected.toSlug,
          trigger: detected.rule.trigger,
          reason: `${specialistName} recommended ${detected.toName} during a conversation.`,
          ...(detected.rule.urgency ? { urgency: detected.rule.urgency } : {}),
          // Model-detected handoffs record the referral + timeline but never
          // reassign the care plan — that stays a reviewed/explicit action.
          assignPlan: false,
        });
        referralSuggestion = { toRole: detected.toName, reason: detected.rule.trigger, urgency: detected.rule.urgency ?? 'Routine' };
      } catch {
        // best-effort
      }
    }
  }

  if (ctx?.userId) {
    const mem = extractMemory(query);
    if (mem && (await isMemoryEnabled(ctx.userId))) {
      await memoryRepo.remember({ scope: 'user', kind: mem.kind, key: `user:${mem.content.slice(0, 40)}`, content: mem.content, userId: ctx.userId, agentId: agent.id, importance: 3, source: 'chat' });
    }
  }

  const escalate = pre.escalate || post.mustEscalate;
  return {
    text: post.text,
    specialist: specialistName,
    citations,
    retrieved,
    grounded: retrieved.length > 0,
    available: true,
    escalationRecommended: escalate,
    escalationReason: escalate ? (pre.reason ?? 'Human clinical review recommended.') : null,
    language: pref.language,
    usage: raw.usage,
    costUsd: raw.costUsd,
    latencyMs: raw.latencyMs,
    traceId: raw.traceId,
    model: raw.model,
    promptVersion: activeVer ? { id: activeVer.versionId, version: activeVer.version, status: activeVer.status } : null,
    safety: { category: pre.category, blocked: false, issues: post.issues },
    referralSuggestion,
  };
}

export async function herneSpecialistReply(agent: AiAgent, history: ChatMessage[], query: string, ctx?: HerneCtx): Promise<HerneReply> {
  const prep = await prepareTurn(agent, history, query, ctx);
  if (prep.kind === 'blocked') return prep.reply;
  try {
    const res = await prep.provider.chat({ system: prep.system, messages: prep.messages, maxTokens: 900, op: 'herne:reply', ...(ctx?.signal ? { signal: ctx.signal } : {}) });
    return finalizeTurn(prep, agent, query, ctx, { text: res.text, usage: res.usage, model: res.model, costUsd: res.costUsd, latencyMs: res.latencyMs, traceId: res.traceId, stopReason: res.stopReason });
  } catch {
    await runLogRepo.log({ agentId: agent.id, actorId: ctx?.userId ?? null, input: query, output: '', latencyMs: Date.now() - prep.started, status: 'error' });
    return {
      ...unavailable(prep.specialistName, prep.pref.language, true),
      text: `I'm sorry — I couldn't complete that just now. Please try again, or I can pass you to a member of the team.`,
      retrieved: prep.retrieved,
      escalationRecommended: prep.pre.escalate,
      escalationReason: prep.pre.escalate ? prep.pre.reason : null,
      safety: { category: prep.pre.category, blocked: false, issues: [] },
    };
  }
}

/** Streamed HERNE turn — yields text deltas then one terminal `final` with the full reply. */
export async function* streamHerneReply(agent: AiAgent, history: ChatMessage[], query: string, ctx?: HerneCtx): AsyncGenerator<HerneStreamChunk> {
  const prep = await prepareTurn(agent, history, query, ctx);
  if (prep.kind === 'blocked') {
    yield { type: 'final', reply: prep.reply };
    return;
  }
  let text = '';
  let raw: RawResult = { text: '', usage: null, model: null, costUsd: 0, latencyMs: 0, traceId: null, stopReason: null };
  try {
    for await (const chunk of prep.provider.stream({ system: prep.system, messages: prep.messages, maxTokens: 900, op: 'herne:stream', ...(ctx?.signal ? { signal: ctx.signal } : {}) })) {
      if (chunk.type === 'delta') {
        text += chunk.text;
        yield { type: 'delta', text: chunk.text };
      } else {
        raw = { text, usage: chunk.result.usage, model: chunk.result.model, costUsd: chunk.result.costUsd, latencyMs: chunk.result.latencyMs, traceId: chunk.result.traceId, stopReason: chunk.result.stopReason };
      }
    }
    const reply = await finalizeTurn(prep, agent, query, ctx, raw);
    yield { type: 'final', reply };
  } catch {
    await runLogRepo.log({ agentId: agent.id, actorId: ctx?.userId ?? null, input: query, output: '', latencyMs: Date.now() - prep.started, status: 'error' });
    yield {
      type: 'final',
      reply: {
        ...unavailable(prep.specialistName, prep.pref.language, true),
        text: `I'm sorry — I couldn't complete that just now. Please try again, or I can pass you to a member of the team.`,
        retrieved: prep.retrieved,
        safety: { category: prep.pre.category, blocked: false, issues: [] },
      },
    };
  }
}

/** Whether an agent is a HERNE specialist (so the chat routes to the HERNE reply). */
export function isHerneSpecialist(slug: string): boolean {
  return herneProfile(slug) !== undefined;
}
