'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/authorize';
import { appointmentsAdminRepo } from './repositories/appointments-admin-repo';
import { auditRepo } from './repositories/audit-repo';

/** Staff-level appointment management: confirm / complete / cancel / no-show. */
export async function setAppointmentStatusAction(formData: FormData): Promise<void> {
  const session = await assertRole('staff');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) return;
  const done = await appointmentsAdminRepo.setStatus(id, status as 'confirmed' | 'cancelled' | 'completed' | 'no_show');
  if (done) {
    await auditRepo.log({ actorId: session.user.id, action: `appointment.${status}`, entityType: 'appointments', entityId: id });
  }
  revalidatePath('/admin/appointments');
}
