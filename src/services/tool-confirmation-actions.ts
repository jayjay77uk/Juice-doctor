'use server';
import { assertSession } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/admin';
import { requestSupportAction } from './conversation-actions';
import { agents } from './agents';
import { subscriptionsService } from './subscriptions';
import { z } from 'zod';

export async function confirmSupportToolAction(requestId: string, confirm: boolean): Promise<{ ok: boolean; error?: string }> {
  const { user } = await assertSession();
  if (!z.string().uuid().safeParse(requestId).success || typeof confirm !== 'boolean') return { ok: false, error: 'Invalid request.' };
  const sb = createAdminClient();
  if (!sb) return { ok: false, error: 'Support is unavailable.' };
  const { data: pending } = await sb.from('ai_tool_executions').select('id, conversation_id, agent_id, tool_id')
    .eq('id', requestId).eq('user_id', user.id).eq('status', 'awaiting_confirmation').maybeSingle();
  if (!pending) return { ok: false, error: 'This request is no longer pending.' };
  const { data: tool } = await sb.from('ai_tools').select('enabled, handler_ref').eq('id', pending.tool_id).maybeSingle();
  const { data: binding } = await sb.from('ai_agent_tools').select('agent_id').eq('agent_id', pending.agent_id).eq('tool_id', pending.tool_id).maybeSingle();
  const agent = await agents.byId(String(pending.agent_id));
  const access = await subscriptionsService.memberAccess(user.id);
  const conv = await sb.from('conversations').select('id').eq('id', pending.conversation_id).eq('agent_id', pending.agent_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (confirm && (!conv.data || !tool?.enabled || tool.handler_ref !== 'member.request_human_support' || !binding || !agent.ok || agent.data.status !== 'active' || !access.ok || !access.data.includes(agent.data.slug))) return { ok: false, error: 'This request is no longer available. You can request support directly.' };
  const claimed = await sb.from('ai_tool_executions').update({ status: confirm ? 'running' : 'declined' })
    .eq('id', requestId).eq('user_id', user.id).eq('status', 'awaiting_confirmation').select('id').maybeSingle();
  if (claimed.error || !claimed.data) return { ok: false, error: 'This request has already been handled.' };
  if (!confirm) return { ok: true };
  try {
    const result = await requestSupportAction(String(pending.conversation_id));
    const saved = await sb.from('ai_tool_executions').update({ status: result.ok ? 'completed' : 'failed', completed_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'running');
    if (saved.error) return { ok: false, error: 'Support may have been requested, but confirmation could not be recorded. Check your conversation before retrying.' };
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  } catch {
    await sb.from('ai_tool_executions').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'running');
    return { ok: false, error: 'Support could not be confirmed. Please check your conversation.' };
  }
}
