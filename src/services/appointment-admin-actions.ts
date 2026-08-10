'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/authorize';
import { appointmentsAdminRepo } from './repositories/appointments-admin-repo';
import { auditRepo } from './repositories/audit-repo';
import { sendTemplateMail } from './mail';
import { consultations } from '@/content/programmes';

const LOCATION_LABELS: Record<string, string> = { video: 'Video call', phone: 'Phone call', in_person: 'In person' };

/** Staff-level appointment management: confirm / complete / cancel / no-show. */
export async function setAppointmentStatusAction(formData: FormData): Promise<void> {
  const session = await assertRole('staff');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) return;
  // Read the facts BEFORE the update so a cancellation email can state them.
  const facts = status === 'confirmed' || status === 'cancelled' ? await appointmentsAdminRepo.mailFacts(id) : null;
  const done = await appointmentsAdminRepo.setStatus(id, status as 'confirmed' | 'cancelled' | 'completed' | 'no_show');
  if (done) {
    await auditRepo.log({ actorId: session.user.id, action: `appointment.${status}`, entityType: 'appointments', entityId: id });
    // Member notification goes to the outbox; it only sends once email is
    // connected. Deduped so repeated clicks never queue duplicates.
    if (facts) {
      const service = consultations.find((c) => c.slug === facts.serviceSlug)?.title ?? facts.serviceSlug.replaceAll('-', ' ');
      try {
        if (status === 'confirmed') {
          await sendTemplateMail({
            to: facts.memberEmail,
            template: 'appointment.confirmed',
            params: { service, startIso: facts.scheduledStart, location: LOCATION_LABELS[facts.locationType] ?? facts.locationType },
            dedupeKey: `appt-confirmed:${id}:${facts.scheduledStart}`,
          });
        } else {
          await sendTemplateMail({
            to: facts.memberEmail,
            template: 'appointment.cancelled',
            params: { service, startIso: facts.scheduledStart },
            dedupeKey: `appt-cancelled:${id}:${facts.scheduledStart}`,
          });
        }
      } catch {
        // mail must never block the status change
      }
    }
  }
  revalidatePath('/admin/appointments');
}
