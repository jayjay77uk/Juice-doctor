import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';
import { HERNE_SPECIALIST_PROFILES, type HerneSpecialistProfile } from '@/data/herne/specialist-profiles';
import { HERNE_SHARED_DNA } from '@/data/herne/specialist-content';

/**
 * Seed the eight HERNE specialists into ai_agents (with herne_config), REMOVE any
 * retired generic placeholders (so exactly eight specialists remain), store the
 * organisation-level shared DNA, and import
 * each specialist's starter system prompt as a versioned draft. Idempotent.
 */

const ACCENTS = ['teal', 'green', 'amber', 'sage'] as const;
const PLACEHOLDER_SLUGS = ['specialist-ai-1', 'specialist-ai-2', 'specialist-ai-3', 'specialist-ai-4'];

export interface HerneSeedReport {
  specialists: number;
  archivedPlaceholders: number;
  promptsImported: number;
  dnaStored: boolean;
  persisted: boolean;
}

async function systemOwnerId(sb: SupabaseClient): Promise<string> {
  const admin = await sb.from('profiles').select('id').eq('role', 'administrator').limit(1).maybeSingle();
  if (admin.data?.id) return String(admin.data.id);
  const any = await sb.from('profiles').select('id').limit(1).maybeSingle();
  return any.data?.id ? String(any.data.id) : '00000000-0000-0000-0000-000000000000';
}

function agentRow(profile: HerneSpecialistProfile, owner: string, i: number): Record<string, unknown> {
  return {
    organisation_id: HERNE_ORG,
    slug: profile.specialistId,
    kind: 'specialist',
    name: profile.name,
    code: profile.specialistId.slice(0, 8).toUpperCase(),
    description: `${profile.title}. ${profile.primaryFunction}`,
    purpose: profile.primaryFunction,
    role: profile.title,
    personality: profile.tone,
    system_prompt: profile.starterPrompt,
    welcome_message: profile.greeting,
    response_boundaries: profile.mustNotDo,
    temperature: 0.5,
    max_output_tokens: 1024,
    memory_config: { useUserMemory: true, useConversationMemory: true, useOrganisationMemory: true, useGlobalMemory: false },
    safety_rules: { blockedTopics: [], requireDisclaimer: true, escalateOn: [] },
    follow_up_config: { enabled: false, cadence: 'weekly', message: '' },
    escalation_config: { enabled: true, target: 'human clinical review', channel: 'in_app', note: profile.referralStyle },
    subscription_available: true,
    visibility: 'public',
    status: 'active',
    owner_id: owner,
    product: {
      tagline: profile.principle,
      expertise: profile.primaryDomains.split(';').map((s) => s.trim()).filter(Boolean).slice(0, 6),
      priceLabel: 'Price on request',
      priceAmount: 0,
      interval: 'month',
      accent: ACCENTS[i % ACCENTS.length],
    },
    herne_config: {
      specialistId: profile.specialistId,
      principle: profile.principle,
      greeting: profile.greeting,
      greetingStatus: profile.greetingStatus,
      philosophy: profile.philosophy,
      philosophyStatus: profile.philosophyStatus,
      primaryFunction: profile.primaryFunction,
      primaryDomains: profile.primaryDomains,
      hernePriority: profile.hernePriority,
      wearableAccess: profile.wearableAccess,
      allowedActions: profile.allowedActions,
      mustNotDo: profile.mustNotDo,
      referralStyle: profile.referralStyle,
      coreOutput: profile.coreOutput,
      outputFormat: profile.outputFormat,
      tone: profile.tone,
    },
    updated_at: new Date().toISOString(),
  };
}

async function importPrompt(sb: SupabaseClient, agentId: string, profile: HerneSpecialistProfile, owner: string): Promise<boolean> {
  if (!profile.starterPrompt.trim()) return false;
  const existing = await sb.from('ai_prompts').select('id').eq('agent_id', agentId).eq('kind', 'system').maybeSingle();
  if (existing.data) return false; // already imported — do not overwrite a stored prompt
  const { data: prompt } = await sb
    .from('ai_prompts')
    .insert({
      organisation_id: HERNE_ORG,
      agent_id: agentId,
      kind: 'system',
      name: `${profile.name} — starter system prompt`,
      description: 'Client-supplied starter prompt (HERNE developer pack).',
      current_version: 1,
      publish_status: 'draft',
      created_by: owner,
    })
    .select('id')
    .single();
  if (!prompt) return false;
  await sb.from('ai_prompt_versions').insert({
    prompt_id: prompt.id,
    version: 1,
    content: profile.starterPrompt,
    publish_status: 'draft',
    change_note: 'Imported client_supplied_seed (v1)',
    created_by: owner,
  });
  return true;
}

export async function seedHerneSpecialists(): Promise<HerneSeedReport> {
  const sb = createAdminClient();
  if (!sb) return { specialists: 0, archivedPlaceholders: 0, promptsImported: 0, dnaStored: false, persisted: false };

  const owner = await systemOwnerId(sb);
  let specialists = 0;
  let promptsImported = 0;
  const idBySlug: Record<string, string> = {};

  for (let i = 0; i < HERNE_SPECIALIST_PROFILES.length; i++) {
    const profile = HERNE_SPECIALIST_PROFILES[i];
    if (!profile) continue;
    const { data } = await sb
      .from('ai_agents')
      .upsert(agentRow(profile, owner, i), { onConflict: 'organisation_id,slug' })
      .select('id')
      .single();
    if (data) {
      specialists += 1;
      idBySlug[profile.specialistId] = String(data.id);
      if (await importPrompt(sb, String(data.id), profile, owner)) promptsImported += 1;
    }
  }

  // Remove the retired generic placeholders entirely so exactly eight HERNE
  // specialists remain. Reassign any conversations that pointed at them to the
  // concierge (Makela) first, then delete the agents (prompts + knowledge sources
  // cascade). This makes a fresh OR existing install converge to the eight.
  const makelaId = String(idBySlug.makela ?? '');
  if (makelaId) {
    const { data: legacy } = await sb.from('ai_agents').select('id').eq('organisation_id', HERNE_ORG).in('slug', PLACEHOLDER_SLUGS);
    const legacyIds = (legacy ?? []).map((r) => String(r.id));
    if (legacyIds.length) {
      await sb.from('conversations').update({ agent_id: makelaId }).in('agent_id', legacyIds);
    }
  }
  const { data: removed } = await sb
    .from('ai_agents')
    .delete()
    .eq('organisation_id', HERNE_ORG)
    .in('slug', PLACEHOLDER_SLUGS)
    .select('id');
  const archivedPlaceholders = removed?.length ?? 0;

  // Store the shared DNA as organisation-level behavioural configuration.
  const dnaValue = { dna: HERNE_SHARED_DNA, updatedAt: new Date().toISOString() };
  const existingDna = await sb.from('system_settings').select('id').eq('organisation_id', HERNE_ORG).eq('key', 'herne_shared_dna').maybeSingle();
  if (existingDna.data) {
    await sb.from('system_settings').update({ value: dnaValue, updated_at: new Date().toISOString() }).eq('id', existingDna.data.id);
  } else {
    await sb.from('system_settings').insert({
      organisation_id: HERNE_ORG,
      key: 'herne_shared_dna',
      value: dnaValue,
      description: 'HERNE shared specialist DNA — inherited by every specialist at runtime.',
      is_public: false,
    });
  }

  return { specialists, archivedPlaceholders, promptsImported, dnaStored: true, persisted: true };
}
