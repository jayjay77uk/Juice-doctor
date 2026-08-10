'use server';

import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { memberRepo } from './repositories/member-repo';
import { sendTemplateMail } from './mail';
import { consultations } from '@/content/programmes';

/**
 * Member booking actions — create, cancel and reschedule the signed-in member's
 * OWN appointments. Server-side validation throughout: only known services, only
 * valid location types, sensible time bounds; new/moved bookings start as
 * 'requested' until a member of the team confirms them.
 */

const LOCATIONS = ['video', 'phone', 'in_person'] as const;
const DEFAULT_DURATION_MINS = 45;
const MIN_LEAD_MS = 60 * 60_000; // at least 1 hour ahead
const MAX_AHEAD_MS = 90 * 86_400_000; // at most 90 days ahead

export interface BookingResult {
  ok: boolean;
  error?: string;
}

function validServiceSlug(slug: string): boolean {
  return consultations.some((c) => c.slug === slug);
}

function serviceTitle(slug: string): string {
  return consultations.find((c) => c.slug === slug)?.title ?? slug.replaceAll('-', ' ');
}

const LOCATION_LABELS: Record<string, string> = { video: 'Video call', phone: 'Phone call', in_person: 'In person' };

/**
 * Queue a member appointment email — best-effort and honest: the outbox
 * records it and it only ever *sends* once the email provider is connected.
 */
async function queueAppointmentMail(
  to: string,
  template: 'appointment.requested' | 'appointment.confirmed' | 'appointment.cancelled' | 'appointment.rescheduled',
  facts: { service: string; startIso: string; location: string },
): Promise<void> {
  try {
    if (template === 'appointment.cancelled') {
      await sendTemplateMail({ to, template, params: { service: facts.service, startIso: facts.startIso } });
    } else {
      await sendTemplateMail({ to, template, params: facts });
    }
  } catch {
    // never let mail problems affect the booking result
  }
}

function validateStart(startIso: string): string | null {
  const t = new Date(startIso).getTime();
  if (!Number.isFinite(t)) return 'Please choose a valid date and time.';
  const now = Date.now();
  if (t < now + MIN_LEAD_MS) return 'Please choose a time at least an hour from now.';
  if (t > now + MAX_AHEAD_MS) return 'Please choose a time within the next 90 days.';
  return null;
}

export async function bookAppointmentAction(input: {
  serviceSlug: string;
  locationType: string;
  startIso: string;
  notes?: string;
}): Promise<BookingResult> {
  let userId: string;
  let userEmail: string;
  try {
    const session = await assertSession();
    userId = session.user.id;
    userEmail = session.user.email;
  } catch {
    return { ok: false, error: 'Please sign in to book.' };
  }
  if (!isSupabaseAdminConfigured()) return { ok: false, error: 'Booking is currently unavailable. Please try again later.' };
  if (!validServiceSlug(input.serviceSlug)) return { ok: false, error: 'Please choose a service.' };
  if (!(LOCATIONS as readonly string[]).includes(input.locationType)) return { ok: false, error: 'Please choose how you would like to meet.' };
  const timeError = validateStart(input.startIso);
  if (timeError) return { ok: false, error: timeError };
  const notes = (input.notes ?? '').slice(0, 500);

  const result = await memberRepo.bookAppointment(userId, {
    serviceSlug: input.serviceSlug,
    locationType: input.locationType,
    startIso: input.startIso,
    durationMins: DEFAULT_DURATION_MINS,
    notes,
  });
  if (result.ok) {
    if (userEmail) {
      await queueAppointmentMail(userEmail, 'appointment.requested', {
        service: serviceTitle(input.serviceSlug),
        startIso: input.startIso,
        location: LOCATION_LABELS[input.locationType] ?? input.locationType,
      });
    }
    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard');
  }
  return result;
}

export async function cancelAppointmentAction(appointmentId: string): Promise<BookingResult> {
  let userId: string;
  let userEmail: string;
  try {
    const session = await assertSession();
    userId = session.user.id;
    userEmail = session.user.email;
  } catch {
    return { ok: false, error: 'Please sign in.' };
  }
  if (!isSupabaseAdminConfigured()) return { ok: false, error: 'This is currently unavailable. Please try again later.' };
  // Capture the appointment facts before cancelling so the email states them.
  const existing = (await memberRepo.upcomingAppointments(userId)).find((a) => a.id === appointmentId);
  const result = await memberRepo.cancelAppointment(userId, appointmentId);
  if (result.ok) {
    if (userEmail && existing) {
      await queueAppointmentMail(userEmail, 'appointment.cancelled', {
        service: existing.title,
        startIso: existing.scheduledStart,
        location: '',
      });
    }
    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard');
  }
  return result;
}

export async function rescheduleAppointmentAction(appointmentId: string, startIso: string): Promise<BookingResult> {
  let userId: string;
  let userEmail: string;
  try {
    const session = await assertSession();
    userId = session.user.id;
    userEmail = session.user.email;
  } catch {
    return { ok: false, error: 'Please sign in.' };
  }
  if (!isSupabaseAdminConfigured()) return { ok: false, error: 'This is currently unavailable. Please try again later.' };
  const timeError = validateStart(startIso);
  if (timeError) return { ok: false, error: timeError };
  const existing = (await memberRepo.upcomingAppointments(userId)).find((a) => a.id === appointmentId);
  const result = await memberRepo.rescheduleAppointment(userId, appointmentId, startIso, DEFAULT_DURATION_MINS);
  if (result.ok) {
    if (userEmail && existing) {
      await queueAppointmentMail(userEmail, 'appointment.rescheduled', {
        service: existing.title,
        startIso,
        location: LOCATION_LABELS[existing.type] ?? existing.type,
      });
    }
    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard');
  }
  return result;
}
