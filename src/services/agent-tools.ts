import 'server-only';
import { z } from 'zod';
import type { AiAgent } from '@/types/ai';
import type { AiChatRequest, AiProvider, AiStreamChunk, AiChatResult } from '@/lib/ai/provider';
import { createAdminClient } from '@/lib/supabase/admin';
import { carePlan } from './herne/care-plan';
import { subscriptionsService } from './subscriptions';

const EMPTY = z.object({}).strict();
const SUPPORT = z.object({ reason: z.string().trim().min(1).max(200) }).strict();
export const TOOL_HANDLERS = {
  'member.read_goals': { name: 'read_goals', description: 'Read the signed-in member’s saved wellbeing goals.', schema: EMPTY, sensitive: false },
  'member.read_care_plan': { name: 'read_care_plan', description: 'Read the signed-in member’s shared care plan and current recommendations.', schema: EMPTY, sensitive: false },
  'member.read_appointments': { name: 'read_appointments', description: 'Read the signed-in member’s appointment records. Does not book or pay.', schema: EMPTY, sensitive: false },
  'member.request_human_support': { name: 'request_human_support', description: 'Prepare an in-app request for human support. The member must confirm it before it is submitted. Never claim the team was notified until confirmed.', schema: SUPPORT, sensitive: true },
} as const;
type HandlerKey = keyof typeof TOOL_HANDLERS;
type ToolBinding = { id: string; handler: HandlerKey; sensitive: boolean };
export type ToolContext = { userId: string; conversationId: string; agent: AiAgent };

export function validateToolInput(handler: string, input: unknown) {
  const def = TOOL_HANDLERS[handler as HandlerKey];
  return def ? def.schema.safeParse(input) : null;
}

async function bindings(ctx: ToolContext): Promise<ToolBinding[]> {
  const sb = createAdminClient(); if (!sb) return [];
  const { data, error } = await sb.from('ai_agent_tools').select('ai_tools!inner(id, key, handler_ref, enabled, is_sensitive, organisation_id)').eq('agent_id', ctx.agent.id);
  if (error) throw new Error('Tool configuration unavailable.');
  return (data ?? []).flatMap(row => {
    const tool = row.ai_tools as unknown as { id: string; key: string; handler_ref: string; enabled: boolean; is_sensitive: boolean; organisation_id: string };
    const def = TOOL_HANDLERS[tool.handler_ref as HandlerKey];
    if (!def || !tool.enabled || tool.organisation_id !== ctx.agent.organisationId || tool.key !== def.name) return [];
    return [{ id: tool.id, handler: tool.handler_ref as HandlerKey, sensitive: def.sensitive || tool.is_sensitive }];
  });
}

async function execute(ctx: ToolContext, binding: ToolBinding, call: { id: string; input: unknown }): Promise<unknown> {
  const sb = createAdminClient(); if (!sb) throw new Error('Tool store unavailable.');
  const current = await sb.from('conversations').select('id').eq('id', ctx.conversationId).eq('user_id', ctx.userId).eq('agent_id', ctx.agent.id).eq('status', 'active').maybeSingle();
  const access = await subscriptionsService.memberAccess(ctx.userId);
  if (!current.data || !access.ok || !access.data.includes(ctx.agent.slug)) throw new Error('Tool access denied.');
  // Re-read the allowlist at execution time so a revoked binding cannot finish a pending run.
  if (!(await bindings(ctx)).some(b => b.id === binding.id && b.handler === binding.handler)) throw new Error('Tool was disabled.');
  const parsed = validateToolInput(binding.handler, call.input);
  if (!parsed?.success) throw new Error('Invalid tool arguments.');
  const audit = await sb.from('ai_tool_executions').insert({ user_id: ctx.userId, conversation_id: ctx.conversationId, agent_id: ctx.agent.id, tool_id: binding.id, call_id: call.id, status: binding.sensitive ? 'awaiting_confirmation' : 'running', input: binding.sensitive ? parsed.data : {} }).select('id').single();
  if (audit.error || !audit.data) throw new Error('Tool audit unavailable.');
  if (binding.sensitive) return { status: 'awaiting_member_confirmation', requestId: audit.data.id, message: 'Ask the member to review and confirm the action displayed in this conversation.' };
  try {
    let output: unknown;
    if (binding.handler === 'member.read_goals') {
      const r = await sb.from('goals').select('title, category, status, progress').eq('user_id', ctx.userId).limit(20); if (r.error) throw r.error; output = r.data;
    } else if (binding.handler === 'member.read_care_plan') {
      const plan = await carePlan.get(ctx.userId); output = plan ? { goals: plan.goals, concerns: plan.concerns, actions: await carePlan.actions(plan.id) } : { plan: null };
    } else {
      const r = await sb.from('appointments').select('id, scheduled_start, scheduled_end, status, location_type').eq('member_id', ctx.userId).order('scheduled_start', { ascending: false }).limit(10); if (r.error) throw r.error; output = r.data;
    }
    const done = await sb.from('ai_tool_executions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', audit.data.id);
    if (done.error) throw done.error;
    return output;
  } catch {
    await sb.from('ai_tool_executions').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', audit.data.id);
    throw new Error('The requested record could not be read.');
  }
}

/** Bounded native tool-call loop. All tools use a static, server-owned schema and handler
 * allowlist; model-supplied code, URLs and member IDs are never executed. */
export async function* streamAgentTools(provider: AiProvider, request: AiChatRequest, ctx?: ToolContext): AsyncGenerator<AiStreamChunk> {
  const allowed = ctx ? await bindings(ctx) : [];
  if (!ctx || !allowed.length) { yield* provider.stream(request); return; }
  const tools: NonNullable<AiChatRequest['tools']> = allowed.map(b => {
    const d = TOOL_HANDLERS[b.handler];
    return { name: d.name, description: d.description, input_schema: { type: 'object', properties: b.handler === 'member.request_human_support' ? { reason: { type: 'string', minLength: 1, maxLength: 200 } } : {}, additionalProperties: false, required: b.handler === 'member.request_human_support' ? ['reason'] : [] } };
  });
  const toolMessages: NonNullable<AiChatRequest['toolMessages']> = request.messages.map(m => ({ ...m }));
  let totalInput = 0, totalOutput = 0, costUsd = 0, latencyMs = 0;
  for (let round = 0; round < 4; round++) {
    if (request.signal?.aborted) throw new Error('Request stopped.');
    let final: AiChatResult | null = null;
    // Buffer planning rounds: only the final answer is shown as the assistant answer.
    for await (const chunk of provider.stream({ ...request, tools: round < 3 ? tools : [], toolMessages })) {
      if (chunk.type === 'final') final = chunk.result;
      else yield chunk;
    }
    if (!final) throw new Error('Incomplete provider response.');
    totalInput += final.usage?.inputTokens ?? 0; totalOutput += final.usage?.outputTokens ?? 0;
    costUsd += final.costUsd; latencyMs += final.latencyMs;
    if (!final.toolCalls?.length) {
      // Final text is already safety-checked by the HERNE caller before persistence.
      yield { type: 'final', result: { ...final, usage: { inputTokens: totalInput, outputTokens: totalOutput }, costUsd, latencyMs } }; return;
    }
    if (round === 3 || final.toolCalls.length > 4) throw new Error('Tool-call limit reached.');
    yield { type: 'delta', text: '\n\n' };
    toolMessages.push({ role: 'assistant', content: final.contentBlocks ?? [] });
    const results = [];
    for (const call of final.toolCalls) {
      const binding = allowed.find(b => TOOL_HANDLERS[b.handler].name === call.name);
      try {
        if (!binding) throw new Error('Tool is not allowed.');
        const output = await execute(ctx, binding, call);
        results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output).slice(0, 12_000) });
      } catch {
        results.push({ type: 'tool_result', tool_use_id: call.id, content: 'Tool unavailable or not permitted. Do not claim success.', is_error: true });
      }
    }
    toolMessages.push({ role: 'user', content: results });
  }
}

export async function pendingToolRequests(userId: string, conversationId: string) {
  const sb = createAdminClient(); if (!sb) return [];
  const { data } = await sb.from('ai_tool_executions').select('id, input, created_at').eq('user_id', userId).eq('conversation_id', conversationId).eq('status','awaiting_confirmation');
  return (data ?? []).map(r => ({ id: String(r.id), reason: String((r.input as { reason?: string })?.reason ?? 'Request human support') }));
}
