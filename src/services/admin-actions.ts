'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { agents, type AgentPatch } from './agents';
import { promptService } from './prompts';
import { knowledge } from './knowledge';
import { featureFlags } from './feature-flags';
import { playground } from './playground';
import type { ActionResult } from './result';
import type { AgentVisibility } from '@/types/ai';
import type { PublishStatus } from '@/types/knowledge';
import type { PlaygroundResult } from '@/types/ai-platform';

/**
 * Admin Server Actions — the write path for AI agent management. Prototype
 * mutates the in-process store; production repoints the same actions at Supabase.
 * Every mutation is validated with zod and (in production) would be audited and
 * permission-checked (assertPermission('agents.*')) before running.
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
  description: z.string().optional().or(z.literal('')),
  role: z.string().min(1),
  personality: z.string().optional().or(z.literal('')),
  systemPrompt: z.string().optional().or(z.literal('')),
  temperature: z.coerce.number().min(0).max(2),
  maxOutputTokens: z.coerce.number().int().min(1).max(200000),
  visibility: z.enum(['private', 'organisation', 'public']),
});

export async function updateAgentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the fields.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const patch: AgentPatch = {
    name: parsed.data.name,
    description: parsed.data.description ?? '',
    role: parsed.data.role,
    personality: parsed.data.personality ?? '',
    systemPrompt: parsed.data.systemPrompt ?? '',
    temperature: parsed.data.temperature,
    maxOutputTokens: parsed.data.maxOutputTokens,
    visibility: parsed.data.visibility as AgentVisibility,
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
  };
  const result = await agents.update(parsed.data.id, patch);
  if (!result.ok) return { status: 'error', message: result.error.message };
  revalidatePath(`/admin/ai/agents/${parsed.data.id}`);
  revalidatePath('/admin/ai/agents');
  return { status: 'success', message: 'Agent saved. (Prototype: stored in the in-memory mock store.)' };
}

// ── Single-operation form actions (hidden `id` field) ────────────────────────

async function readId(formData: FormData): Promise<string> {
  const id = formData.get('id');
  return typeof id === 'string' ? id : '';
}

export async function publishAgentAction(formData: FormData): Promise<void> {
  await agents.publish(await readId(formData));
  revalidatePath('/admin/ai/agents');
  revalidatePath(`/admin/ai/agents/${await readId(formData)}`);
}

export async function archiveAgentAction(formData: FormData): Promise<void> {
  await agents.archive(await readId(formData));
  revalidatePath('/admin/ai/agents');
}

export async function toggleAgentAction(formData: FormData): Promise<void> {
  const id = await readId(formData);
  const current = await agents.byId(id);
  if (current.ok) {
    await agents.setStatus(id, current.data.status === 'active' ? 'disabled' : 'active');
  }
  revalidatePath('/admin/ai/agents');
  revalidatePath(`/admin/ai/agents/${id}`);
}

export async function duplicateAgentAction(formData: FormData): Promise<void> {
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
  const parsed = promptDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the fields.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const result = await promptService.createDraft(parsed.data.promptId, parsed.data.content, parsed.data.changeNote ?? 'Edited draft');
  if (!result.ok) return { status: 'error', message: result.error.message };
  revalidatePath(`/admin/ai/prompts/${parsed.data.promptId}`);
  return { status: 'success', message: `Draft v${result.data.version} saved. (Prototype: in-memory.)` };
}

export async function publishPromptVersionAction(formData: FormData): Promise<void> {
  const promptId = String(formData.get('promptId') ?? '');
  const version = Number(formData.get('version') ?? 0);
  await promptService.publishVersion(promptId, version);
  revalidatePath(`/admin/ai/prompts/${promptId}`);
  revalidatePath('/admin/ai/prompts');
}

export async function rollbackPromptAction(formData: FormData): Promise<void> {
  const promptId = String(formData.get('promptId') ?? '');
  const version = Number(formData.get('version') ?? 0);
  await promptService.rollback(promptId, version);
  revalidatePath(`/admin/ai/prompts/${promptId}`);
}

// ── Knowledge workflow ───────────────────────────────────────────────────────

export async function transitionDocumentAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const to = String(formData.get('to') ?? '') as PublishStatus;
  await knowledge.documents.transition(id, to);
  revalidatePath('/admin/knowledge');
  revalidatePath(`/admin/knowledge/${id}`);
}

// ── Feature flags (Configuration Centre) ─────────────────────────────────────

export async function toggleFeatureFlagAction(formData: FormData): Promise<void> {
  const key = String(formData.get('key') ?? '');
  if (featureFlags.isValidKey(key)) {
    await featureFlags.toggle(key);
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
}): Promise<{ ok: true; result: PlaygroundResult } | { ok: false; error: string }> {
  if (!input.query.trim()) return { ok: false, error: 'Enter a question to test.' };
  const result = await playground.run(input);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, result: result.data };
}
