'use server';
import { assertSession } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/admin';
import { conversationsRepo } from './repositories/conversations-repo';
import { agents } from './agents';
import { subscriptionsService } from './subscriptions';
import { normalizeSpecialistRef } from './herne/referral-matrix';
import { isHerneSpecialist } from './herne/reply';
import { hasConsent } from './consents';
import { z } from 'zod';

export async function acceptSpecialistHandoff(messageId: string): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const { user } = await assertSession();
  if (!z.string().uuid().safeParse(messageId).success) return { ok: false, error: 'This referral is not available.' };
  const sb = createAdminClient();
  if (!sb || !(await hasConsent(user.id, 'ai_processing'))) return { ok: false, error: 'Review AI processing consent in Settings before continuing.' };
  const { data: message } = await sb.from('messages').select('conversation_id, referral').eq('id', messageId).eq('role', 'assistant').maybeSingle();
  if (!message?.referral?.toRole) return { ok: false, error: 'This referral is not available.' };
  const source = await conversationsRepo.byId(String(message.conversation_id));
  if (!source.ok || source.data.userId !== user.id || source.data.status === 'deleted') return { ok: false, error: 'Conversation not found.' };
  const slug = normalizeSpecialistRef(String(message.referral.toRole));
  if (!isHerneSpecialist(slug)) return { ok: false, error: 'This referral needs the care team. Use Request support.' };
  const target = await agents.bySlug(slug);
  const access = await subscriptionsService.memberAccess(user.id);
  if (!target.ok || target.data.status !== 'active' || !access.ok || !access.data.includes(slug)) return { ok: false, error: 'This specialist is not currently available on your plan.' };
  const existing = await sb.from('conversations').select('id').eq('user_id', user.id).eq('agent_id', target.data.id).eq('status', 'active')
    .contains('context', { handoff: { sourceMessageId: messageId } }).limit(1).maybeSingle();
  if (existing.error) return { ok: false, error: 'The handoff could not be checked. Please try again.' };
  if (existing.data) return { ok: true, conversationId: String(existing.data.id) };
  const created = await conversationsRepo.create({ userId: user.id, agentId: target.data.id,
    context: { handoff: { sourceConversationId: source.data.id, sourceMessageId: messageId, reason: String(message.referral.reason ?? '').slice(0, 500) } },
  });
  if (!created.ok) return { ok: false, error: created.error.message };
  return { ok: true, conversationId: created.data.id };
}
