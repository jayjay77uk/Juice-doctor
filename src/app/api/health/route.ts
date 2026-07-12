import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured, isSupabaseAdminConfigured, isAiConfigured, env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAiProvider } from '@/lib/ai';
import { parseReceptionistResult } from '@/lib/ai/receptionist-schema';
import { receptionist } from '@/services/receptionist';
import { agents } from '@/services/agents';
import { knowledgeRepo } from '@/services/repositories/knowledge-repo';
import { memoryRepo } from '@/services/repositories/memory-repo';
import { specialistReply } from '@/services/specialist-reply';

/**
 * Public health / readiness endpoint — the deployment-verification instrument.
 * Reports the running commit + whether Supabase and the AI provider are
 * configured, and exercises a live DB round-trip (service role) to prove
 * connectivity. NEVER returns any secret value — only booleans and the git SHA.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7);
  const vercelEnv = process.env.VERCEL_ENV ?? 'local';

  let db: { ok: boolean; error: string | null } = { ok: false, error: 'admin client not configured' };
  const admin = createAdminClient();
  if (admin) {
    try {
      // A minimal privileged round-trip that needs a valid service-role key + DB.
      const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      db = { ok: !error, error: error?.message ?? null };
    } catch (e) {
      db = { ok: false, error: e instanceof Error ? e.message : 'db check failed' };
    }
  }

  // Opt-in live AI probe (?ai=1 chat, ?ai=structured structured-output).
  // Diagnoses provider/model/schema issues. Never returns the key.
  let aiProbe: { ok: boolean; model: string; error: string | null; raw?: string } | undefined;
  const aiMode = request.nextUrl.searchParams.get('ai');
  if (aiMode === '1' || aiMode === 'structured') {
    aiProbe = { ok: false, model: env.aiModel, error: 'provider not configured' };
    const provider = getAiProvider();
    if (provider) {
      try {
        if (aiMode === 'structured') {
          const sys = [
            'Return a JSON object with exactly these fields:',
            'summary (string), identifiedNeeds (string[]), relevantFacts (string[]), unansweredQuestions (string[]),',
            'recommendedSpecialistIds (string[]), primaryRecommendation (string or null), alternativeRecommendations (string[]),',
            'confidence (number 0..1), escalationRequired (boolean), escalationReason (string or null), suggestedNextAction (string).',
          ].join(' ');
          const value = await provider.structured(
            { system: sys, messages: [{ role: 'user', content: 'The visitor wants nutrition help to lose weight.' }], maxTokens: 700, temperature: 0.2 },
            parseReceptionistResult,
          );
          aiProbe = { ok: true, model: env.aiModel, error: null, raw: JSON.stringify(value).slice(0, 400) };
        } else {
          const res = await provider.chat({ messages: [{ role: 'user', content: 'ping' }], maxTokens: 5 });
          aiProbe = { ok: true, model: res.model, error: null };
        }
      } catch (e) {
        const cause = e instanceof Error && 'cause' in e ? (e as { cause?: unknown }).cause : undefined;
        const causeMsg = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
        aiProbe = {
          ok: false,
          model: env.aiModel,
          error: `${e instanceof Error ? e.message : 'ai probe failed'}${causeMsg ? ` — ${causeMsg}` : ''}`,
        };
      }
    }
  }

  // Opt-in end-to-end routing probe (?receptionist=1): runs the real assess()
  // path (reads DB specialists + AI reasoning) with a canned nutrition query.
  let receptionistProbe: Record<string, unknown> | undefined;
  if (request.nextUrl.searchParams.get('receptionist') === '1') {
    const r = await receptionist.assess({
      conversation: [],
      answers: [
        { id: 'q1', prompt: 'What would you like help with today?', answer: 'I want help with my nutrition and a weekly meal plan to lose weight.' },
        { id: 'q2', prompt: 'What outcome are you hoping for?', answer: 'I would like to lose about 8kg and eat more healthily.' },
        { id: 'q3', prompt: 'How soon do you need help?', answer: 'As soon as possible.' },
      ],
    });
    receptionistProbe = r.ok
      ? {
          escalate: r.data.recommendation.escalate,
          specialist: r.data.recommendation.specialistName,
          slug: r.data.recommendation.specialistSlug,
          confidence: r.data.recommendation.confidence,
          summary: r.data.summary.slice(0, 220),
        }
      : { error: r.error.message };
  }

  // Opt-in grounded-chat probe (?specialist=1): ensures the Nutrition Coach has
  // knowledge (ingesting a sample if empty), then runs a real grounded reply.
  let specialistProbe: Record<string, unknown> | undefined;
  if (request.nextUrl.searchParams.get('specialist') === '1') {
    const a = await agents.bySlug('specialist-ai-1');
    if (!a.ok) {
      specialistProbe = { error: 'specialist not found' };
    } else {
      const agent = a.data;
      const docs = await knowledgeRepo.documentsForAgent(agent.id);
      if (!docs.length) {
        await knowledgeRepo.ingestText({
          agentId: agent.id,
          title: 'Nutrition basics',
          text: 'A balanced weekly meal plan for healthy weight loss includes lean protein, plenty of vegetables, whole grains, and around 1.5 to 2 litres of water per day. Aim for a modest calorie deficit of about 500 kcal per day to lose roughly 0.5 kg per week. Batch-cooking at the weekend makes it easier to stay consistent. Limit ultra-processed snacks and sugary drinks.',
        });
      }
      const reply = await specialistReply(agent, [], 'How much water should I drink each day and how fast can I safely lose weight?');
      specialistProbe = {
        specialist: agent.name,
        grounded: reply.grounded,
        citations: reply.citations,
        available: reply.available,
        reply: reply.text.slice(0, 320),
      };
    }
  }

  // Opt-in memory probe (?memory=1): remember a fact, recall it, and confirm a
  // reply respects it.
  let memoryProbe: Record<string, unknown> | undefined;
  if (request.nextUrl.searchParams.get('memory') === '1') {
    const sb = createAdminClient();
    const prof = sb ? await sb.from('profiles').select('id').limit(1).maybeSingle() : null;
    const userId = prof?.data?.id as string | undefined;
    const a = await agents.bySlug('specialist-ai-1');
    if (!userId || !a.ok) {
      memoryProbe = { error: 'setup failed' };
    } else {
      await memoryRepo.remember({
        scope: 'user',
        kind: 'fact',
        key: 'diet',
        content: 'The customer is vegetarian and allergic to nuts.',
        userId,
        agentId: a.data.id,
        importance: 5,
        source: 'probe',
      });
      const recalled = await memoryRepo.recall({ userId, limit: 5 });
      const reply = await specialistReply(a.data, [], 'What could I have for a quick lunch today?', { userId });
      memoryProbe = { recalled: recalled.map((m) => m.content), reply: reply.text.slice(0, 320) };
    }
  }

  return NextResponse.json({
    ok: true,
    commit,
    vercelEnv,
    ...(receptionistProbe ? { receptionist: receptionistProbe } : {}),
    ...(specialistProbe ? { specialist: specialistProbe } : {}),
    ...(memoryProbe ? { memory: memoryProbe } : {}),
    supabase: {
      configured: isSupabaseConfigured(),
      adminConfigured: isSupabaseAdminConfigured(),
      db,
    },
    ai: { configured: isAiConfigured(), ...(aiProbe ? { probe: aiProbe } : {}) },
    time: new Date().toISOString(),
  });
}
