import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';

/**
 * Fetch the active prompt version for a HERNE specialist agent at inference time.
 * Prefers a published/approved version; falls back to the current_version row when
 * nothing has been explicitly published yet (seeded prompts start as drafts). The
 * caller falls back to the bundled starter prompt when this returns null (preview
 * mode / not seeded), so live inference always has a system prompt.
 */

export interface ActivePrompt {
  versionId: string;
  version: number;
  content: string;
  status: string;
}

export async function activePrompt(agentId: string): Promise<ActivePrompt | null> {
  const sb = createAdminClient();
  if (!sb) return null;

  const { data: prompt } = await sb
    .from('ai_prompts')
    .select('id, current_version')
    .eq('agent_id', agentId)
    .eq('organisation_id', HERNE_ORG)
    .eq('kind', 'system')
    .maybeSingle();
  if (!prompt?.id) return null;

  // Prefer an explicitly published/approved version.
  const { data: published } = await sb
    .from('ai_prompt_versions')
    .select('id, version, content, publish_status')
    .eq('prompt_id', String(prompt.id))
    .in('publish_status', ['published', 'approved'])
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = published
    ? published
    : (
        await sb
          .from('ai_prompt_versions')
          .select('id, version, content, publish_status')
          .eq('prompt_id', String(prompt.id))
          .eq('version', Number(prompt.current_version))
          .maybeSingle()
      ).data;

  if (!row?.content) return null;
  return {
    versionId: String(row.id),
    version: Number(row.version),
    content: String(row.content),
    status: String(row.publish_status),
  };
}
