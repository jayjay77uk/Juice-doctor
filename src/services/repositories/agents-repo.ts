import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AiAgent,
  AiAgentDefinition,
  AiAgentVersion,
  AgentStatus,
  AgentKind,
  AgentVisibility,
  SpecialistProduct,
  AgentMemoryConfig,
  AgentSafetyRules,
  AgentFollowUpConfig,
  AgentEscalationConfig,
} from '@/types/ai';
import { DEFAULT_AI_AGENTS } from '@/config/ai-agents';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from '../result';
import type { AgentPatch } from '../agents';

/**
 * Real repository for AI agents — the `ai_agents` table is the source of truth.
 * Uses the service-role client (callers are already permission-checked). Maps
 * between the DB row and the `AiAgent` domain type so the service + admin UI are
 * unchanged. On first use it lazily + idempotently seeds the agent roster from
 * the code registry (config/ai-agents.ts) so the platform is never empty.
 */

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

let seeded = false;

function nowIso(): string {
  return new Date().toISOString();
}
function toUuid(v: unknown): string {
  return typeof v === 'string' && UUID_RE.test(v) ? v : NIL_UUID;
}
function num(v: unknown, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function str(v: unknown, d = ''): string {
  return typeof v === 'string' ? v : d;
}

const DEFAULT_MEMORY: AgentMemoryConfig = {
  useUserMemory: true,
  useConversationMemory: true,
  useOrganisationMemory: false,
  useGlobalMemory: false,
};
const DEFAULT_SAFETY: AgentSafetyRules = { blockedTopics: [], requireDisclaimer: true, escalateOn: [] };
const DEFAULT_FOLLOW_UP: AgentFollowUpConfig = { enabled: false, cadence: 'weekly', message: '' };
const DEFAULT_ESCALATION: AgentEscalationConfig = { enabled: true, target: 'the team', channel: 'whatsapp', note: '' };

function rowToAgent(row: Row): AiAgent {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    slug: str(row.slug),
    kind: (row.kind as AgentKind) ?? 'specialist',
    product: (row.product as SpecialistProduct | null) ?? null,
    name: str(row.name),
    code: str(row.code),
    description: str(row.description),
    purpose: str(row.purpose),
    role: str(row.role),
    personality: str(row.personality),
    systemPrompt: str(row.system_prompt),
    welcomeMessage: str(row.welcome_message),
    responseBoundaries: str(row.response_boundaries),
    temperature: num(row.temperature, 0.5),
    maxOutputTokens: row.max_output_tokens == null ? null : num(row.max_output_tokens, 1024),
    defaultModelId: (row.default_model_id as string | null) ?? null,
    memoryConfig: (row.memory_config as AgentMemoryConfig | null) || DEFAULT_MEMORY,
    safetyRules: (row.safety_rules as AgentSafetyRules | null) || DEFAULT_SAFETY,
    followUpConfig: (row.follow_up_config as AgentFollowUpConfig | null) || DEFAULT_FOLLOW_UP,
    escalationConfig: (row.escalation_config as AgentEscalationConfig | null) || DEFAULT_ESCALATION,
    subscriptionAvailable: Boolean(row.subscription_available),
    visibility: (row.visibility as AgentVisibility) ?? 'private',
    status: (row.status as AgentStatus) ?? 'draft',
    version: num(row.version, 1),
    ownerId: String(row.owner_id ?? NIL_UUID),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

/** Full insert row from an agent definition (used by the seed). */
function definitionToRow(d: AiAgentDefinition): Row {
  return {
    organisation_id: d.organisationId,
    slug: d.slug,
    kind: d.kind,
    product: d.product,
    name: d.name,
    code: d.code,
    description: d.description,
    purpose: d.purpose,
    role: d.role,
    personality: d.personality,
    system_prompt: d.systemPrompt,
    welcome_message: d.welcomeMessage,
    response_boundaries: d.responseBoundaries,
    temperature: d.temperature,
    max_output_tokens: d.maxOutputTokens,
    default_model_id: d.defaultModelId,
    memory_config: d.memoryConfig,
    safety_rules: d.safetyRules,
    follow_up_config: d.followUpConfig,
    escalation_config: d.escalationConfig,
    subscription_available: d.subscriptionAvailable,
    visibility: d.visibility,
    status: d.status,
    owner_id: toUuid(d.ownerId),
  };
}

function patchToRow(patch: AgentPatch): Row {
  const row: Row = { updated_at: nowIso() };
  const set = (key: string, value: unknown) => {
    if (value !== undefined) row[key] = value;
  };
  set('name', patch.name);
  set('code', patch.code);
  set('description', patch.description);
  set('purpose', patch.purpose);
  set('role', patch.role);
  set('personality', patch.personality);
  set('system_prompt', patch.systemPrompt);
  set('welcome_message', patch.welcomeMessage);
  set('response_boundaries', patch.responseBoundaries);
  set('temperature', patch.temperature);
  set('max_output_tokens', patch.maxOutputTokens);
  set('default_model_id', patch.defaultModelId);
  set('memory_config', patch.memoryConfig);
  set('safety_rules', patch.safetyRules);
  set('follow_up_config', patch.followUpConfig);
  set('escalation_config', patch.escalationConfig);
  set('subscription_available', patch.subscriptionAvailable);
  set('product', patch.product);
  set('visibility', patch.visibility);
  set('status', patch.status);
  return row;
}

/** Seed the agent roster from the code registry once, idempotently. */
async function ensureSeeded(sb: SupabaseClient): Promise<void> {
  if (seeded) return;
  const { count, error } = await sb.from('ai_agents').select('id', { count: 'exact', head: true });
  if (error) return; // don't mark seeded on a read failure
  if ((count ?? 0) > 0) {
    seeded = true;
    return;
  }
  const rows = DEFAULT_AI_AGENTS.map(definitionToRow);
  const { error: seedError } = await sb.from('ai_agents').upsert(rows, { onConflict: 'organisation_id,slug' });
  if (!seedError) seeded = true;
}

function unavailable(): Result<never> {
  return err({ code: 'unavailable', message: 'The agent store is currently unavailable.' });
}

export const agentsRepo = {
  async list(): Promise<Result<AiAgent[]>> {
    const sb = createAdminClient();
    if (!sb) return unavailable();
    await ensureSeeded(sb);
    const { data, error } = await sb.from('ai_agents').select('*').order('name', { ascending: true });
    if (error) return err({ code: 'unavailable', message: error.message });
    return ok((data ?? []).map(rowToAgent));
  },

  async byId(id: string): Promise<Result<AiAgent>> {
    const sb = createAdminClient();
    if (!sb) return unavailable();
    const { data } = await sb.from('ai_agents').select('*').eq('id', id).maybeSingle();
    return data ? ok(rowToAgent(data)) : err({ code: 'not_found', message: 'Agent not found.' });
  },

  async bySlug(slug: string): Promise<Result<AiAgent>> {
    const sb = createAdminClient();
    if (!sb) return unavailable();
    await ensureSeeded(sb);
    const { data } = await sb.from('ai_agents').select('*').eq('slug', slug).maybeSingle();
    return data ? ok(rowToAgent(data)) : err({ code: 'not_found', message: 'Agent not found.' });
  },

  async create(input: {
    name: string;
    slug: string;
    description: string;
    role: string;
    ownerId: string;
    organisationId: string;
  }): Promise<Result<AiAgent>> {
    const sb = createAdminClient();
    if (!sb) return unavailable();
    const existing = await sb
      .from('ai_agents')
      .select('id')
      .eq('organisation_id', input.organisationId)
      .eq('slug', input.slug)
      .maybeSingle();
    if (existing.data) return err({ code: 'invalid', message: 'An agent with that slug already exists.' });

    const row: Row = {
      organisation_id: input.organisationId,
      slug: input.slug,
      kind: 'specialist',
      product: null,
      name: input.name,
      code: '',
      description: input.description,
      purpose: 'Set the purpose of this specialist in the admin backend.',
      role: input.role,
      personality: 'Clear, helpful and professional.',
      system_prompt: '',
      welcome_message: 'Hello — how can I help you today?',
      response_boundaries: 'Answer using the assigned knowledge base. Stay within this specialist’s remit.',
      temperature: 0.7,
      max_output_tokens: 1024,
      default_model_id: null,
      memory_config: DEFAULT_MEMORY,
      safety_rules: DEFAULT_SAFETY,
      follow_up_config: { enabled: false, cadence: 'weekly', message: 'Checking in — how are things going?' },
      escalation_config: { enabled: true, target: 'the team', channel: 'whatsapp', note: 'Escalate when the customer needs human help.' },
      subscription_available: false,
      visibility: 'private',
      status: 'draft',
      owner_id: toUuid(input.ownerId),
    };
    const { data, error } = await sb.from('ai_agents').insert(row).select('*').single();
    if (error || !data) return err({ code: 'unavailable', message: error?.message ?? 'Could not create the agent.' });
    return ok(rowToAgent(data));
  },

  async update(id: string, patch: AgentPatch): Promise<Result<AiAgent>> {
    const sb = createAdminClient();
    if (!sb) return unavailable();
    const { data, error } = await sb.from('ai_agents').update(patchToRow(patch)).eq('id', id).select('*').maybeSingle();
    if (error) return err({ code: 'unavailable', message: error.message });
    return data ? ok(rowToAgent(data)) : err({ code: 'not_found', message: 'Agent not found.' });
  },

  async setStatus(id: string, status: AgentStatus): Promise<Result<AiAgent>> {
    return agentsRepo.update(id, { status });
  },

  async publish(id: string): Promise<Result<AiAgent>> {
    const sb = createAdminClient();
    if (!sb) return unavailable();
    const current = await sb.from('ai_agents').select('*').eq('id', id).maybeSingle();
    if (!current.data) return err({ code: 'not_found', message: 'Agent not found.' });
    const version = num(current.data.version, 1) + 1;
    const { data, error } = await sb
      .from('ai_agents')
      .update({ status: 'active', version, updated_at: nowIso() })
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) return err({ code: 'unavailable', message: error?.message ?? 'Publish failed.' });
    const published = rowToAgent(data);
    await sb.from('ai_agent_versions').insert({
      agent_id: id,
      version,
      snapshot: published as unknown as Record<string, unknown>,
      change_note: `Version ${version}`,
      created_by: toUuid(published.ownerId),
    });
    return ok(published);
  },

  async duplicate(id: string): Promise<Result<AiAgent>> {
    const sb = createAdminClient();
    if (!sb) return unavailable();
    const current = await sb.from('ai_agents').select('*').eq('id', id).maybeSingle();
    if (!current.data) return err({ code: 'not_found', message: 'Agent not found.' });
    const agent = rowToAgent(current.data);
    const row = definitionToRow({
      ...agent,
      slug: `${agent.slug}-copy`,
      name: `${agent.name} (copy)`,
      status: 'draft',
      tools: [],
      knowledgeCategories: [],
    } as AiAgentDefinition);
    const { data, error } = await sb.from('ai_agents').insert(row).select('*').single();
    if (error || !data) return err({ code: 'unavailable', message: error?.message ?? 'Could not duplicate the agent.' });
    return ok(rowToAgent(data));
  },

  async archive(id: string): Promise<Result<AiAgent>> {
    return agentsRepo.setStatus(id, 'archived');
  },

  async versions(id: string): Promise<Result<AiAgentVersion[]>> {
    const sb = createAdminClient();
    if (!sb) return unavailable();
    const { data, error } = await sb
      .from('ai_agent_versions')
      .select('*')
      .eq('agent_id', id)
      .order('version', { ascending: false });
    if (error) return err({ code: 'unavailable', message: error.message });
    return ok(
      (data ?? []).map((v: Row) => ({
        id: String(v.id),
        agentId: String(v.agent_id),
        version: num(v.version, 1),
        snapshot: (v.snapshot as Record<string, unknown>) ?? {},
        changeNote: str(v.change_note),
        createdBy: String(v.created_by ?? ''),
        createdAt: str(v.created_at),
      })),
    );
  },
};
