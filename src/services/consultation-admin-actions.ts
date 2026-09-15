'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/authorize';
import { consultationsRepo } from './repositories/consultations-repo';
import { auditRepo } from './repositories/audit-repo';
import { hasConsent } from './consents';

/** Staff-level consultation workflow: append notes, approve or request changes. */

async function canActOnCase(caseId: string, session: Awaited<ReturnType<typeof assertRole>>): Promise<boolean> {
  const result = await consultationsRepo.byId(caseId);
  if (!result) return false;
  // Practitioners are least-privilege: only their assigned cases. Staff/admin
  // retain the existing operational oversight available from /admin.
  return session.user.role !== 'practitioner' || (result.consultation.practitionerId === session.user.id && await hasConsent(result.consultation.memberId, 'health_data_sharing'));
}

export async function addConsultationNoteAction(formData: FormData): Promise<void> {
  const session = await assertRole('practitioner');
  const id = String(formData.get('id') ?? '');
  const text = String(formData.get('text') ?? '').trim().slice(0, 1000);
  if (!id || text.length < 2 || !(await canActOnCase(id, session))) return;
  const done = await consultationsRepo.addNote(id, session.user.id, text);
  if (done) {
    await auditRepo.log({ actorId: session.user.id, action: 'consultation.note.added', entityType: 'consultations', entityId: id });
  }
  revalidatePath(`/admin/consultations/${id}`);
  revalidatePath(`/practitioner/cases/${id}`);
  revalidatePath('/practitioner');
}

export async function reviewConsultationAction(formData: FormData): Promise<void> {
  const session = await assertRole('practitioner');
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (!id || (decision !== 'approve' && decision !== 'request_changes') || !(await canActOnCase(id, session))) return;
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
  revalidatePath(`/practitioner/cases/${id}`);
  revalidatePath('/practitioner');
}
