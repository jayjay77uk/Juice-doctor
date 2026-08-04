'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/authorize';
import { consultationsRepo } from './repositories/consultations-repo';
import { auditRepo } from './repositories/audit-repo';

/** Staff-level consultation workflow: append notes, approve or request changes. */

export async function addConsultationNoteAction(formData: FormData): Promise<void> {
  const session = await assertRole('practitioner');
  const id = String(formData.get('id') ?? '');
  const text = String(formData.get('text') ?? '').trim().slice(0, 1000);
  if (!id || text.length < 2) return;
  const done = await consultationsRepo.addNote(id, session.user.id, text);
  if (done) {
    await auditRepo.log({ actorId: session.user.id, action: 'consultation.note.added', entityType: 'consultations', entityId: id });
  }
  revalidatePath(`/admin/consultations/${id}`);
}

export async function reviewConsultationAction(formData: FormData): Promise<void> {
  const session = await assertRole('practitioner');
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (!id || (decision !== 'approve' && decision !== 'request_changes')) return;
  const done = await consultationsRepo.review(id, session.user.id, decision);
  if (done) {
    await auditRepo.log({
      actorId: session.user.id,
      action: decision === 'approve' ? 'consultation.approved' : 'consultation.changes_requested',
      entityType: 'consultations',
      entityId: id,
    });
  }
  revalidatePath(`/admin/consultations/${id}`);
  revalidatePath('/admin/consultations');
}
