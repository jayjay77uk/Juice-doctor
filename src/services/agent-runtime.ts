import 'server-only';
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { AVAILABLE_MODELS } from '@/config/ai-models';
import type { AiAgent } from '@/types/ai';
import type { AiChatRequest } from '@/lib/ai/provider';
import { AiUnavailableError } from '@/lib/ai/provider';
import { memoryRepo } from './repositories/memory-repo';
import { isMemoryEnabled } from './memory-prefs';

export async function runtimeOptions(agent: AiAgent): Promise<Pick<AiChatRequest, 'model' | 'temperature' | 'maxTokens'>> {
  let model = env.aiModel;
  if (agent.defaultModelId) {
    const sb = createAdminClient();
    if (!sb) throw new AiUnavailableError('Model configuration is unavailable.');
    const { data, error } = await sb.from('ai_models').select('model_key, enabled, ai_model_providers!inner(key, enabled, organisation_id)').eq('id', agent.defaultModelId).maybeSingle();
    const provider = data?.ai_model_providers as unknown as { key: string; enabled: boolean; organisation_id: string | null } | null;
    if (error || !data?.enabled || !provider?.enabled || provider.key !== 'anthropic' || (provider.organisation_id && provider.organisation_id !== agent.organisationId)) throw new AiUnavailableError('Selected model is not available under the provider policy.');
    model = String(data.model_key);
  }
  if (!model.startsWith('claude-')) throw new AiUnavailableError('Only Claude models are allowed.');
  return { model, maxTokens: Math.min(8192, env.aiMaxOutputTokens, Math.max(1, agent.maxOutputTokens ?? env.aiMaxOutputTokens)),
    // Sonnet 5/Opus 4.7+ use provider sampling; unsupported temperature is explicit in the UI.
    ...(/haiku-4-5|sonnet-4-[56]|opus-4-[56]/.test(model) ? { temperature: Math.max(0, Math.min(1, agent.temperature)) } : {}),
  };
}

/** Resolve the picker to a real FK. Never write legacy string IDs into a UUID column. */
export async function resolveModelSelection(selection: string, organisationId: string): Promise<string | null> {
  if (!selection) return null;
  const sb = createAdminClient(); if (!sb) throw new Error('Model store unavailable.');
  const option = AVAILABLE_MODELS.find(m => m.id === selection);
  if (!option) {
    const { data } = await sb.from('ai_models').select('id, ai_model_providers!inner(key, organisation_id)').eq('id', selection).eq('enabled', true).maybeSingle();
    const p = data?.ai_model_providers as unknown as { key: string; organisation_id: string | null } | null;
    if (!data || p?.key !== 'anthropic' || (p.organisation_id && p.organisation_id !== organisationId)) throw new Error('Choose an available Claude model.');
    return String(data.id);
  }
  const provider = await sb.from('ai_model_providers').select('id').eq('key', 'anthropic').is('organisation_id', null).maybeSingle();
  if (!provider.data) throw new Error('Apply the model catalogue migration before selecting a model.');
  const r = await sb.from('ai_models').upsert({ provider_id: provider.data.id, model_key: option.modelKey, display_name: option.label, context_window: option.contextWindow, enabled: true }, { onConflict: 'provider_id,model_key' }).select('id').single();
  if (r.error || !r.data) throw new Error('Could not save the model selection.');
  return String(r.data.id);
}

export async function recallForAgent(agent: AiAgent, userId?: string | null, conversationId?: string | null) {
  const permitted = userId ? await isMemoryEnabled(userId) : false;
  return memoryRepo.recall({
    userId: permitted ? userId ?? null : null,
    conversationId: permitted ? conversationId ?? null : null,
    config: agent.memoryConfig, organisationId: agent.organisationId,
    limit: Math.min(20, Math.max(0, agent.memoryConfig.maxItems ?? 8)),
  });
}
