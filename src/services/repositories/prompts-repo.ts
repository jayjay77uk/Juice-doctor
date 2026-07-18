import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, type Result } from '../result';
import type { Prompt, PromptVersion, PromptKind } from '@/types/ai-platform';
import type { PublishStatus } from '@/types/knowledge';

/**
 * Production prompt registry over ai_prompts + ai_prompt_versions (migration
 * 0014). This closes the loop with runtime inference: publishing a version here
 * is exactly what `services/herne/prompt-version.ts#activePrompt` reads at reply
 * time, so an admin edit → publish changes the live specialist behaviour.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

function rowToPrompt(r: Record<string, unknown>): Prompt {
  return {
    id: String(r.id),
    organisationId: String(r.organisation_id ?? ORG),
    agentId: (r.agent_id as string | null) ?? null,
    kind: (r.kind as PromptKind) ?? 'system',
    name: String(r.name),
    description: (r.description as string | null) ?? null,
    currentVersion: Number(r.current_version ?? 1),
    publishStatus: (r.publish_status as PublishStatus) ?? 'draft',
    createdBy: (r.created_by as string | null) ?? null,
    updatedAt: String(r.updated_at ?? r.created_at),
  };
}

function rowToVersion(r: Record<string, unknown>): PromptVersion {
  return {
    id: String(r.id),
    promptId: String(r.prompt_id),
    version: Number(r.version),
    content: String(r.content ?? ''),
    publishStatus: (r.publish_status as PublishStatus) ?? 'draft',
    changeNote: (r.change_note as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    approvedBy: (r.approved_by as string | null) ?? null,
    approvedAt: (r.approved_at as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

function noDb<T>(): Result<T> {
  return err({ code: 'unavailable', message: 'The prompt registry is not available.' });
}

export const promptsRepo = {
  async list(filter?: { agentId?: string; kind?: PromptKind }): Promise<Result<Prompt[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    let q = sb.from('ai_prompts').select('*').eq('organisation_id', ORG).order('name');
    if (filter?.agentId) q = q.eq('agent_id', filter.agentId);
    if (filter?.kind) q = q.eq('kind', filter.kind);
    const { data } = await q;
    return ok((data ?? []).map(rowToPrompt));
  },

  async byId(id: string): Promise<Result<Prompt>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('ai_prompts').select('*').eq('id', id).maybeSingle();
    return data ? ok(rowToPrompt(data)) : err({ code: 'not_found', message: 'Prompt not found.' });
  },

  async versions(promptId: string): Promise<Result<PromptVersion[]>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('ai_prompt_versions').select('*').eq('prompt_id', promptId).order('version', { ascending: false });
    return ok((data ?? []).map(rowToVersion));
  },

  async currentContent(promptId: string): Promise<Result<string>> {
    const prompt = await promptsRepo.byId(promptId);
    if (!prompt.ok) return prompt;
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb
      .from('ai_prompt_versions')
      .select('content')
      .eq('prompt_id', promptId)
      .eq('version', prompt.data.currentVersion)
      .maybeSingle();
    return ok(String(data?.content ?? ''));
  },

  /** Create a new DRAFT version above the latest. */
  async createDraft(promptId: string, content: string, changeNote: string): Promise<Result<PromptVersion>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const prompt = await promptsRepo.byId(promptId);
    if (!prompt.ok) return prompt;
    const { data: maxRow } = await sb
      .from('ai_prompt_versions')
      .select('version')
      .eq('prompt_id', promptId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = Number(maxRow?.version ?? 0) + 1;
    const { data, error } = await sb
      .from('ai_prompt_versions')
      .insert({ prompt_id: promptId, version: nextVersion, content, publish_status: 'draft', change_note: changeNote })
      .select('*')
      .single();
    if (error || !data) return err({ code: 'invalid', message: 'Could not save the draft.' });
    await sb.from('ai_prompts').update({ publish_status: 'draft', updated_at: new Date().toISOString() }).eq('id', promptId);
    return ok(rowToVersion(data));
  },

  /** Publish a version — the runtime assembler picks this up on the next reply. */
  async publishVersion(promptId: string, version: number): Promise<Result<Prompt>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data: target } = await sb
      .from('ai_prompt_versions')
      .select('id')
      .eq('prompt_id', promptId)
      .eq('version', version)
      .maybeSingle();
    if (!target?.id) return err({ code: 'not_found', message: 'Version not found.' });
    await sb
      .from('ai_prompt_versions')
      .update({ publish_status: 'published', approved_at: new Date().toISOString() })
      .eq('id', target.id);
    const { data, error } = await sb
      .from('ai_prompts')
      .update({ current_version: version, publish_status: 'published', updated_at: new Date().toISOString() })
      .eq('id', promptId)
      .select('*')
      .maybeSingle();
    if (error || !data) return err({ code: 'not_found', message: 'Prompt not found.' });
    return ok(rowToPrompt(data));
  },

  async rollback(promptId: string, version: number): Promise<Result<Prompt>> {
    return promptsRepo.publishVersion(promptId, version);
  },

  async compare(promptId: string, versionA: number, versionB: number): Promise<Result<{ a: PromptVersion; b: PromptVersion }>> {
    const sb = createAdminClient();
    if (!sb) return noDb();
    const { data } = await sb.from('ai_prompt_versions').select('*').eq('prompt_id', promptId).in('version', [versionA, versionB]);
    const rows = (data ?? []).map(rowToVersion);
    const a = rows.find((v) => v.version === versionA);
    const b = rows.find((v) => v.version === versionB);
    if (!a || !b) return err({ code: 'not_found', message: 'Version not found.' });
    return ok({ a, b });
  },
};
