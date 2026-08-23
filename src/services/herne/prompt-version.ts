import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';
import { safety, safetyPolicyPrompt } from '@/services/safety';

/**
 * Fetch the active prompt version for a HERNE specialist agent at inference time.
 * Prefers a published/approved version; falls back to the current_version row when
 * nothing has been explicitly published yet (seeded prompts start as drafts). The
 * caller falls back to the bundled starter prompt when this returns null (preview
 * mode / not seeded), so live inference always has a system prompt.
 *
 * Active database-managed safety policies are appended here so BOTH streaming and
 * non-streaming HERNE paths receive the same policy layer without weakening the
 * fixed safety floor in safety-eval.ts. Every seeded HERNE specialist has a stored
 * system prompt, so this is the single runtime seam for admin-managed prompt data.
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

  // Managed policies are additive. Organisation-global policies have no role
  // restrictions; role-restricted policies must be explicitly assigned to the
  // specialist. A database/configuration failure never removes the fixed safety
  // checks enforced independently around the provider call.
  const policyBlock = safetyPolicyPrompt(await safety.activeForAgent(agentId));

  return {
    versionId: String(row.id),
    version: Number(row.version),
    content: [String(row.content), policyBlock].filter(Boolean).join('\n\n'),
    status: String(row.publish_status),
  };
}
