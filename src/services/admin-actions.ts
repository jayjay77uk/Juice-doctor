'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { agents, type AgentPatch } from './agents';
import { promptService } from './prompts';
import { knowledge } from './knowledge';
import { knowledgeRepo } from './repositories/knowledge-repo';
import { featureFlags } from './feature-flags';
import { playground } from './playground';
import { assertRole } from '@/lib/auth/authorize';
import { auditRepo } from './repositories/audit-repo';
import type { ActionResult } from './result';
import type { AgentVisibility } from '@/types/ai';
import type { PublishStatus } from '@/types/knowledge';
import type { PlaygroundResult } from '@/types/ai-platform';

/**
 * Admin Server Actions — the write path for AI agent management. Every action
 * is permission-checked with assertRole('administrator') and persists to the
 * platform database (Supabase); free-form input is validated with zod, and
 * significant changes (agent edits/publish/archive, prompt publishing, flag
 * toggles) are recorded in the append-only audit log via auditRepo.
 */

function toList(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const createSchema = z.object({
  name: z.string().min(2, 'Give the agent a name.'),
  slug: z
    .string()
    .min(2, 'Add a slug.')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens.'),
  role: z.string().min(2, 'Describe the agent’s role.'),
  description: z.string().optional().or(z.literal('')),
});

export async function createAgentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await assertRole('administrator'); } catch { return { status: 'error', message: 'You do not have permission to do this.' }; }
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the fields.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const result = await agents.create({
    name: parsed.data.name,
    slug: parsed.data.slug,
    role: parsed.data.role,
    description: parsed.data.description ?? '',
    ownerId: 'usr_admin',
    organisationId: '00000000-0000-0000-0000-000000000001',
  });
  if (!result.ok) return { status: 'error', message: result.error.message };
  revalidatePath('/admin/ai/agents');
  redirect(`/admin/ai/agents/${result.data.id}`);
}

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  code: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  purpose: z.string().optional().or(z.literal('')),
  role: z.string().min(1),
  personality: z.string().optional().or(z.literal('')),
  systemPrompt: z.string().optional().or(z.literal('')),
  welcomeMessage: z.string().optional().or(z.literal('')),
  responseBoundaries: z.string().optional().or(z.literal('')),
  temperature: z.coerce.number().min(0).max(2),
  maxOutputTokens: z.coerce.number().int().min(1).max(200000),
  visibility: z.enum(['private', 'organisation', 'public']),
});

export async function updateAgentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let actorId: string | null = null;
  try { actorId = (await assertRole('administrator')).user.id; } catch { return { status: 'error', message: 'You do not have permission to do this.' }; }
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the fields.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const patch: AgentPatch = {
    name: parsed.data.name,
    code: parsed.data.code ?? '',
    description: parsed.data.description ?? '',
    purpose: parsed.data.purpose ?? '',
    role: parsed.data.role,
    personality: parsed.data.personality ?? '',
    systemPrompt: parsed.data.systemPrompt ?? '',
    welcomeMessage: parsed.data.welcomeMessage ?? '',
    responseBoundaries: parsed.data.responseBoundaries ?? '',
    temperature: parsed.data.temperature,
    maxOutputTokens: parsed.data.maxOutputTokens,
    visibility: parsed.data.visibility as AgentVisibility,
    subscriptionAvailable: formData.get('subscriptionAvailable') === 'on',
    memoryConfig: {
      useUserMemory: formData.get('useUserMemory') === 'on',
      useConversationMemory: formData.get('useConversationMemory') === 'on',
      useOrganisationMemory: formData.get('useOrganisationMemory') === 'on',
      useGlobalMemory: formData.get('useGlobalMemory') === 'on',
    },
    safetyRules: {
      blockedTopics: toList(formData.get('blockedTopics')),
      escalateOn: toList(formData.get('escalateOn')),
      requireDisclaimer: formData.get('requireDisclaimer') === 'on',
    },
    followUpConfig: {
      enabled: formData.get('followUpEnabled') === 'on',
      cadence: String(formData.get('followUpCadence') ?? 'weekly'),
      message: String(formData.get('followUpMessage') ?? ''),
    },
    escalationConfig: {
      enabled: formData.get('escalationEnabled') === 'on',
      target: String(formData.get('escalationTarget') ?? 'the team'),
      channel: (String(formData.get('escalationChannel') ?? 'whatsapp')) as 'in_app' | 'whatsapp' | 'email',
      note: String(formData.get('escalationNote') ?? ''),
    },
  };
  if (formData.get('hasProduct') === 'true') {
    patch.product = {
      tagline: String(formData.get('productTagline') ?? ''),
      expertise: toList(formData.get('productExpertise')),
      priceLabel: String(formData.get('productPriceLabel') ?? 'Price on request') || 'Price on request',
      priceAmount: Number(formData.get('productPriceAmount') ?? 0) || 0,
      interval: (String(formData.get('productInterval') ?? 'month')) as 'month' | 'year',
      accent: (String(formData.get('productAccent') ?? 'teal')) as 'teal' | 'green' | 'amber' | 'sage',
    };
  }
  const result = await agents.update(parsed.data.id, patch);
  if (!result.ok) return { status: 'error', message: result.error.message };
  await auditRepo.log({ actorId, action: 'agent.updated', entityType: 'ai_agents', entityId: parsed.data.id, after: { label: patch.name } });
  revalidatePath(`/admin/ai/agents/${parsed.data.id}`);
  revalidatePath('/admin/ai/agents');
  return { status: 'success', message: 'Agent saved.' };
}

// ── Single-operation form actions (hidden `id` field) ────────────────────────

async function readId(formData: FormData): Promise<string> {
  const id = formData.get('id');
  return typeof id === 'string' ? id : '';
}

export async function publishAgentAction(formData: FormData): Promise<void> {
  const session = await assertRole('administrator');
  const id = await readId(formData);
  await agents.publish(id);
  await auditRepo.log({ actorId: session.user.id, action: 'agent.published', entityType: 'ai_agents', entityId: id });
  revalidatePath('/admin/ai/agents');
  revalidatePath(`/admin/ai/agents/${id}`);
}

export async function archiveAgentAction(formData: FormData): Promise<void> {
  const session = await assertRole('administrator');
  const id = await readId(formData);
  await agents.archive(id);
  await auditRepo.log({ actorId: session.user.id, action: 'agent.archived', entityType: 'ai_agents', entityId: id });
  revalidatePath('/admin/ai/agents');
}

export async function toggleAgentAction(formData: FormData): Promise<void> {
  const session = await assertRole('administrator');
  const id = await readId(formData);
  const current = await agents.byId(id);
  if (current.ok) {
    const next = current.data.status === 'active' ? 'disabled' : 'active';
    await agents.setStatus(id, next);
    await auditRepo.log({ actorId: session.user.id, action: `agent.${next}`, entityType: 'ai_agents', entityId: id, after: { label: current.data.name } });
  }
  revalidatePath('/admin/ai/agents');
  revalidatePath(`/admin/ai/agents/${id}`);
}

export async function duplicateAgentAction(formData: FormData): Promise<void> {
  await assertRole('administrator');
  const result = await agents.duplicate(await readId(formData));
  revalidatePath('/admin/ai/agents');
  if (result.ok) redirect(`/admin/ai/agents/${result.data.id}`);
}

// ── Prompt management ────────────────────────────────────────────────────────

const promptDraftSchema = z.object({
  promptId: z.string(),
  content: z.string().min(1, 'Prompt content cannot be empty.'),
  changeNote: z.string().optional().or(z.literal('')),
});

export async function savePromptDraftAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await assertRole('administrator'); } catch { return { status: 'error', message: 'You do not have permission to do this.' }; }
  const parsed = promptDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the fields.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const result = await promptService.createDraft(parsed.data.promptId, parsed.data.content, parsed.data.changeNote ?? 'Edited draft');
  if (!result.ok) return { status: 'error', message: result.error.message };
  revalidatePath(`/admin/ai/prompts/${parsed.data.promptId}`);
  return { status: 'success', message: `Draft v${result.data.version} saved.` };
}

export async function publishPromptVersionAction(formData: FormData): Promise<void> {
  const session = await assertRole('administrator');
  const promptId = String(formData.get('promptId') ?? '');
  const version = Number(formData.get('version') ?? 0);
  await promptService.publishVersion(promptId, version);
  await auditRepo.log({ actorId: session.user.id, action: 'prompt.version.published', entityType: 'ai_prompts', entityId: promptId, after: { version } });
  revalidatePath(`/admin/ai/prompts/${promptId}`);
  revalidatePath('/admin/ai/prompts');
}

export async function rollbackPromptAction(formData: FormData): Promise<void> {
  const session = await assertRole('administrator');
  const promptId = String(formData.get('promptId') ?? '');
  const version = Number(formData.get('version') ?? 0);
  await promptService.rollback(promptId, version);
  await auditRepo.log({ actorId: session.user.id, action: 'prompt.version.rolled_back', entityType: 'ai_prompts', entityId: promptId, after: { version } });
  revalidatePath(`/admin/ai/prompts/${promptId}`);
}

// ── Knowledge workflow ───────────────────────────────────────────────────────

export async function transitionDocumentAction(formData: FormData): Promise<void> {
  await assertRole('administrator');
  const id = String(formData.get('id') ?? '');
  const to = String(formData.get('to') ?? '') as PublishStatus;
  await knowledge.documents.transition(id, to);
  revalidatePath('/admin/knowledge');
  revalidatePath(`/admin/knowledge/${id}`);
}

// ── Knowledge brain: upload + indexing pipeline (never "training") ───────────

const uploadSchema = z.object({
  title: z.string().min(2, 'Give the document a title.'),
  // Exactly the DB enum knowledge_source_type — wider values fail the insert.
  sourceType: z.enum(['pdf', 'docx', 'txt', 'csv', 'markdown', 'url', 'manual', 'ocr', 'audio_transcript']),
  assignedSpecialistSlug: z.string().min(1, 'Assign this to a specialist.'),
  categoryId: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
});

export async function uploadDocumentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await assertRole('administrator'); } catch { return { status: 'error', message: 'You do not have permission to do this.' }; }
  const parsed = uploadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the fields.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // If text content is provided, index it for real (chunk + FTS) against the
  // assigned specialist so it can immediately ground the specialist's answers.
  const content = parsed.data.content?.trim();
  if (content) {
    const agent = await agents.bySlug(parsed.data.assignedSpecialistSlug);
    if (agent.ok) {
      const ingested = await knowledgeRepo.ingestText({
        agentId: agent.data.id,
        title: parsed.data.title,
        text: content,
        sourceType: parsed.data.sourceType === 'url' ? 'url' : 'manual',
      });
      if (!ingested.ok) return { status: 'error', message: ingested.error.message };
      revalidatePath('/admin/knowledge');
      revalidatePath(`/admin/specialists/${parsed.data.assignedSpecialistSlug}`);
      return { status: 'success', message: `Indexed “${parsed.data.title}” into ${ingested.data.chunks} searchable chunk(s), assigned to ${agent.data.name}.` };
    }
  }

  const result = await knowledge.documents.create({
    title: parsed.data.title,
    sourceType: parsed.data.sourceType,
    assignedSpecialistSlug: parsed.data.assignedSpecialistSlug,
    categoryId: parsed.data.categoryId || null,
    ...(parsed.data.description ? { description: parsed.data.description } : {}),
  });
  if (!result.ok) return { status: 'error', message: result.error.message };
  revalidatePath('/admin/knowledge');
  revalidatePath(`/admin/specialists/${parsed.data.assignedSpecialistSlug}`);
  return { status: 'success', message: 'Document record created in the “uploaded” state. No file content is stored — paste text to index it, or advance the index state manually.' };
}

function revalidateKnowledge(id: string): void {
  revalidatePath('/admin/knowledge');
  revalidatePath(`/admin/knowledge/${id}`);
}

export async function advanceIndexAction(formData: FormData): Promise<void> {
  await assertRole('administrator');
  const id = String(formData.get('id') ?? '');
  await knowledge.documents.advanceIndex(id);
  revalidateKnowledge(id);
}

export async function failIndexAction(formData: FormData): Promise<void> {
  await assertRole('administrator');
  const id = String(formData.get('id') ?? '');
  await knowledge.documents.setIndexState(id, 'failed');
  revalidateKnowledge(id);
}

export async function setDocActiveAction(formData: FormData): Promise<void> {
  await assertRole('administrator');
  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  await knowledge.documents.setActive(id, active);
  revalidateKnowledge(id);
}

export async function archiveDocAction(formData: FormData): Promise<void> {
  await assertRole('administrator');
  const id = String(formData.get('id') ?? '');
  await knowledge.documents.archiveDoc(id);
  revalidateKnowledge(id);
}

// ── Feature flags (Configuration Centre) ─────────────────────────────────────

export async function toggleFeatureFlagAction(formData: FormData): Promise<void> {
  const session = await assertRole('administrator');
  const key = String(formData.get('key') ?? '');
  if (featureFlags.isValidKey(key)) {
    const enabled = await featureFlags.toggle(key);
    await auditRepo.log({ actorId: session.user.id, action: 'feature_flag.toggled', entityType: 'feature_flags', entityId: key, after: { label: key, enabled } });
  }
  revalidatePath('/admin/config');
}

// ── AI Playground (returns a value; called directly from the client) ─────────

export async function runPlaygroundAction(input: {
  agentId: string;
  promptVersionId?: string;
  query: string;
  knowledgeCount?: number;
  modelKey?: string;
  language?: string;
}): Promise<{ ok: true; result: PlaygroundResult } | { ok: false; error: string }> {
  try { await assertRole('administrator'); } catch { return { ok: false, error: 'Not authorised.' }; }
  if (!input.query.trim()) return { ok: false, error: 'Enter a question to test.' };
  const result = await playground.run(input);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, result: result.data };
}
