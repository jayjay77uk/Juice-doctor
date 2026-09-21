'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertRole } from '@/lib/auth/authorize';
import { conversationsRepo } from './repositories/conversations-repo';
import { auditRepo } from './repositories/audit-repo';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Human-takeover actions for specialist escalations. A staff member (or above)
 * can reply directly INTO the member's escalated conversation — the message
 * persists as a system turn the member sees in their thread, completing the
 * takeover loop from admin oversight to the member experience.
 */

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(2, 'Write a message first.').max(2000),
});

export async function sendCareTeamMessageAction(
  _prev: { status: string; message?: string },
  formData: FormData,
): Promise<{ status: 'idle' | 'success' | 'error'; message?: string }> {
  let actorId: string;
  let actorName: string;
  let organisationId: string | null;
  try {
    const session = await assertRole('staff');
    actorId = session.user.id;
    actorName = session.user.name;
    organisationId = session.user.organisationId;
  } catch {
    return { status: 'error', message: 'You do not have permission to do this.' };
  }
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Please check the message.' };
  }

  const conv = await conversationsRepo.byId(parsed.data.conversationId);
  if (!conv.ok || conv.data.organisationId !== organisationId || conv.data.status !== 'active') return { status: 'error', message: 'That conversation is not available.' };
  const sb = createAdminClient();
  if (!sb) return { status: 'error', message: 'Conversation storage unavailable.' };
  const resumeAi = formData.get('resumeAi') === 'on';
  const changed = await sb.from('conversations').update({ context: { ...conv.data.context, human_takeover: !resumeAi } })
    .eq('id', conv.data.id).eq('organisation_id', organisationId);
  if (changed.error) return { status: 'error', message: 'Could not update the conversation handover.' };

  try { await conversationsRepo.insertSystemMessage(
    parsed.data.conversationId,
    `Care team (${actorName}): ${parsed.data.message.trim()}`,
  ); } catch { return { status: 'error', message: 'The message could not be saved. Please try again.' }; }
  await auditRepo.log({
    actorId,
    action: 'escalation.member_messaged',
    entityType: 'conversations',
    entityId: parsed.data.conversationId,
    after: { label: 'Care-team message sent to member conversation' },
  });
  revalidatePath('/admin/herne/referrals');
  return { status: 'success', message: 'Message sent — the member will see it in their conversation.' };
}
