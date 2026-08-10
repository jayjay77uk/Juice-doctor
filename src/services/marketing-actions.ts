'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/authorize';
import { marketingRepo } from './repositories/marketing-repo';
import { auditRepo } from './repositories/audit-repo';

/** Staff triage of member support tickets: open → in_progress → resolved. */
export async function setSupportTicketStatusAction(formData: FormData): Promise<void> {
  const session = await assertRole('staff');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['open', 'in_progress', 'resolved'].includes(status)) return;
  const { support } = await import('./support');
  const done = await support.setStatus(id, status as 'open' | 'in_progress' | 'resolved');
  if (done) {
    await auditRepo.log({ actorId: session.user.id, action: `support_ticket.${status}`, entityType: 'support_tickets', entityId: id });
  }
  revalidatePath('/admin/messages');
}

/** Staff triage of contact-form messages: new → seen → replied. */
export async function setContactMessageStatusAction(formData: FormData): Promise<void> {
  const session = await assertRole('staff');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['new', 'seen', 'replied'].includes(status)) return;
  const done = await marketingRepo.setContactMessageStatus(id, status as 'new' | 'seen' | 'replied');
  if (done) {
    await auditRepo.log({ actorId: session.user.id, action: `contact_message.${status}`, entityType: 'contact_messages', entityId: id });
  }
  revalidatePath('/admin/messages');
}
