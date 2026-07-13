import 'server-only';

import type { AiAgent } from '@/types/ai';
import type { ChatMessage } from '@/lib/ai';
import { getAiProvider } from '@/lib/ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';
import { retrieveForSpecialist, type HerneRetrieved } from './retrieval';
import { herneProfile, type HerneSpecialistProfile } from '@/data/herne/specialist-profiles';
import { HERNE_SHARED_DNA } from '@/data/herne/specialist-content';
import { runLogRepo } from '../repositories/run-log-repo';
import { memoryRepo, extractMemory, type MemoryItem } from '../repositories/memory-repo';
import { languageDirective, HERNE_DEFAULT_PREFERENCE, type LanguagePreference } from './language';
import { getLanguagePreferenceFor } from './language-store';

/**
 * The differentiated HERNE specialist turn. The runtime prompt assembler inherits
 * the organisation shared DNA and combines it with the selected specialist's
 * config, the ranked shared evidence and the specialist's output format. The
 * model answers grounded ONLY in the retrieved approved evidence, cites record
 * ids, and escalates to human clinical review on alarm signals. Never fabricates.
 */

const ALARM_TERMS = ['pain', 'chest', 'blood', 'faint', 'pregnan', 'medication', 'kidney', 'vomit', 'weight loss', 'confusion', 'suicid'];

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

function assembleSystemPrompt(profile: HerneSpecialistProfile, dna: string[], retrieved: HerneRetrieved[], langDirective: string | null): string {
  const evidenceBlock = retrieved.length
    ? retrieved
        .map(
          (r) =>
            `[${r.recordId}] (evidence: ${r.evidenceStrength || 'unstated'}) ${r.claim}\n${r.documentText}\nSource: ${r.sourceTitle}${r.sourceUrl ? ` — ${r.sourceUrl}` : ''}`,
        )
        .join('\n\n')
    : '(no approved evidence records matched this question)';

  return [
    'You are part of the HERNE wellbeing concierge — a coordinated team of specialists that interpret ONE shared approved evidence base.',
    `SHARED DNA (every specialist upholds these):\n${dna.map((d) => `- ${d}`).join('\n')}`,
    `YOUR ROLE\nYou are ${profile.name}, ${profile.title}.\nConsultation principle: ${profile.principle}\n${profile.philosophy ? `Philosophy: ${profile.philosophy}` : 'Philosophy: (no approved philosophy yet — do not invent one)'}\nCommunication style: ${profile.tone}.\nYou MAY: ${profile.allowedActions}.\nYou MUST NOT: ${profile.mustNotDo}.\nReferral style: ${profile.referralStyle}.`,
    `STARTER INSTRUCTIONS\n${profile.starterPrompt}`,
    `SHARED EVIDENCE — answer using ONLY these approved records and cite each you use as [${'RECORD-ID'}]. Include evidence strength, limitations and source where relevant. Never contradict this evidence or invent facts, figures or clinical claims.\n\n${evidenceBlock}`,
    `OUTPUT FORMAT — structure your answer with these sections, as ${profile.name}:\n${profile.outputFormat.map((s) => `- ${s}`).join('\n')}`,
    langDirective,
    'SAFETY — do not diagnose, prescribe, or advise stopping medication. If the person reports alarm symptoms (e.g. severe or chest pain, fainting, blood in stool, pregnancy concerns, medication interactions), recommend appropriate professional assessment and stop routine coaching.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function herneSpecialistReply(
  agent: AiAgent,
  history: ChatMessage[],
  query: string,
  ctx?: { userId?: string | null; conversationId?: string | null; goal?: string; language?: LanguagePreference },
): Promise<HerneReply> {
  const profile = herneProfile(agent.slug);
  const provider = getAiProvider();
  const specialistName = profile?.name ?? agent.name;
  const pref = await resolvePreference(ctx);

  if (!profile || !provider) {
    return {
      text: `I'm sorry — ${specialistName} is temporarily unavailable. Please try again shortly, or I can connect you with a member of the team.`,
      specialist: specialistName,
      citations: [],
      retrieved: [],
      grounded: false,
      available: Boolean(provider),
      escalationRecommended: false,
      escalationReason: null,
      language: pref.language,
    };
  }

  const started = Date.now();
  const [retrieved, memory, dna] = await Promise.all([
    retrieveForSpecialist(agent.slug, query, ctx?.goal ? { goal: ctx.goal } : {}),
    ctx?.userId || ctx?.conversationId
      ? memoryRepo.recall({ userId: ctx?.userId ?? null, conversationId: ctx?.conversationId ?? null, limit: 6 })
      : Promise.resolve([] as MemoryItem[]),
    sharedDna(),
  ]);

  const alarm = ALARM_TERMS.some((t) => query.toLowerCase().includes(t));
  const system =
    assembleSystemPrompt(profile, dna, retrieved, languageDirective(pref)) +
    (memory.length ? `\n\nWHAT YOU REMEMBER ABOUT THIS PERSON (respect it):\n${memory.map((m) => `- ${m.content}`).join('\n')}` : '');

  try {
    const messages: ChatMessage[] = [...history.slice(-8), { role: 'user', content: query }];
    const res = await provider.chat({ system, messages, maxTokens: 900, op: 'herne:reply' });
    const citations = retrieved.map((r) => ({ recordId: r.recordId, sourceTitle: r.sourceTitle, sourceUrl: r.sourceUrl }));
    await runLogRepo.log({
      agentId: agent.id,
      actorId: ctx?.userId ?? null,
      input: query,
      output: res.text,
      retrieved: retrieved.map((r) => ({ recordId: r.recordId, final: r.score.final, role: r.role })),
      tokensInput: res.usage?.inputTokens ?? null,
      tokensOutput: res.usage?.outputTokens ?? null,
      latencyMs: Date.now() - started,
      status: 'ok',
      model: res.model,
      costUsd: res.costUsd,
      traceId: res.traceId,
    });
    if (ctx?.userId) {
      const mem = extractMemory(query);
      if (mem) {
        await memoryRepo.remember({ scope: 'user', kind: mem.kind, key: `user:${mem.content.slice(0, 40)}`, content: mem.content, userId: ctx.userId, agentId: agent.id, importance: 3, source: 'chat' });
      }
    }
    return {
      text: res.text.trim(),
      specialist: specialistName,
      citations,
      retrieved,
      grounded: retrieved.length > 0,
      available: true,
      escalationRecommended: alarm,
      escalationReason: alarm ? 'Alarm symptoms detected — HERNE referral matrix requires human clinical review.' : null,
      language: pref.language,
    };
  } catch {
    await runLogRepo.log({ agentId: agent.id, actorId: ctx?.userId ?? null, input: query, output: '', latencyMs: Date.now() - started, status: 'error' });
    return {
      text: `I'm sorry — I couldn't complete that just now. Please try again, or I can pass you to a member of the team.`,
      specialist: specialistName,
      citations: [],
      retrieved,
      grounded: false,
      available: true,
      escalationRecommended: alarm,
      escalationReason: alarm ? 'Alarm symptoms detected — human clinical review recommended.' : null,
      language: pref.language,
    };
  }
}

/** Whether an agent is a HERNE specialist (so the chat routes to the HERNE reply). */
export function isHerneSpecialist(slug: string): boolean {
  return herneProfile(slug) !== undefined;
}
