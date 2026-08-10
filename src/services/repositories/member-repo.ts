import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Goal, HealthProfile, FitnessProfile, NutritionProfile } from '@/types/health';
import type { Assessment } from '@/types/consultation';
import type { Notification } from '@/types/platform';

/**
 * Member read repository — the authenticated member's REAL rows (goals,
 * health/fitness/nutrition profiles, assessments, notifications, appointments).
 * Every query is keyed by the caller-supplied authenticated user id; the member
 * service resolves that id from the session, so no cross-user access is possible
 * through this layer. Returns null/[] when a row doesn't exist so pages render
 * honest empty states.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

export interface UpcomingAppointment {
  id: string;
  title: string;
  when: string;
  type: string;
  status: string;
  scheduledStart: string;
}

export interface MemberAppointment {
  id: string;
  serviceSlug: string;
  status: string;
  locationType: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes: string | null;
}

function s(v: unknown): string | null {
  return v == null ? null : String(v);
}

/** DB enum (lightly_active/moderately_active/very_active) → app union. */
function mapActivity(v: string): FitnessProfile['activityLevel'] {
  if (v === 'lightly_active') return 'light';
  if (v === 'moderately_active') return 'moderate';
  if (v === 'very_active') return 'active';
  if (v === 'sedentary' || v === 'athlete') return v;
  return 'moderate';
}

export const memberRepo = {
  async goals(userId: string): Promise<Goal[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      userId: String(r.user_id),
      organisationId: String(r.organisation_id ?? ORG),
      category: (r.category as Goal['category']) ?? 'other',
      title: String(r.title),
      description: s(r.description),
      targetValue: r.target_value != null ? Number(r.target_value) : null,
      unit: s(r.unit),
      baselineValue: r.baseline_value != null ? Number(r.baseline_value) : null,
      currentValue: r.current_value != null ? Number(r.current_value) : null,
      targetDate: s(r.target_date),
      status: (r.status as Goal['status']) ?? 'active',
      progress: Number(r.progress ?? 0),
    }));
  },

  /** Create a goal for the member. */
  async createGoal(
    userId: string,
    input: { category: string; title: string; description?: string | null; targetValue?: number | null; unit?: string | null; targetDate?: string | null },
  ): Promise<{ ok: boolean; error?: string }> {
    const sb = createAdminClient();
    if (!sb) return { ok: false, error: 'Not available right now.' };
    const { error } = await sb.from('goals').insert({
      user_id: userId,
      organisation_id: ORG,
      category: input.category,
      title: input.title,
      description: input.description?.trim() || null,
      target_value: input.targetValue ?? null,
      unit: input.unit?.trim() || null,
      target_date: input.targetDate || null,
      status: 'active',
      progress: 0,
    });
    if (error) return { ok: false, error: 'Could not create the goal. Please try again.' };
    return { ok: true };
  },

  /** Update a goal's progress/status/current value — scoped to the owner. */
  async updateGoal(
    userId: string,
    goalId: string,
    patch: { progress?: number; status?: Goal['status']; currentValue?: number | null },
  ): Promise<{ ok: boolean; error?: string }> {
    const sb = createAdminClient();
    if (!sb) return { ok: false, error: 'Not available right now.' };
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.progress !== undefined) update.progress = patch.progress;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.currentValue !== undefined) update.current_value = patch.currentValue;
    const { error, count } = await sb.from('goals').update(update, { count: 'exact' }).eq('id', goalId).eq('user_id', userId);
    if (error) return { ok: false, error: 'Could not update the goal. Please try again.' };
    if (!count) return { ok: false, error: 'Goal not found.' };
    return { ok: true };
  },

  async healthProfile(userId: string): Promise<HealthProfile | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data: r } = await sb.from('health_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (!r) return null;
    return {
      userId: String(r.user_id),
      organisationId: String(r.organisation_id ?? ORG),
      dateOfBirth: s(r.date_of_birth),
      biologicalSex: (r.biological_sex as HealthProfile['biologicalSex']) ?? null,
      heightCm: r.height_cm != null ? Number(r.height_cm) : null,
      weightKg: r.weight_kg != null ? Number(r.weight_kg) : null,
      bloodType: s(r.blood_type),
      conditions: Array.isArray(r.conditions) ? (r.conditions as string[]) : [],
      allergies: Array.isArray(r.allergies) ? (r.allergies as string[]) : [],
      medications: Array.isArray(r.medications) ? (r.medications as { name: string; dose?: string; frequency?: string }[]) : [],
      emergencyContact: (r.emergency_contact as HealthProfile['emergencyContact']) ?? null,
      notes: s(r.notes),
      updatedAt: String(r.updated_at),
    };
  },

  async fitnessProfile(userId: string): Promise<FitnessProfile | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data: r } = await sb.from('fitness_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (!r) return null;
    return {
      userId: String(r.user_id),
      organisationId: String(r.organisation_id ?? ORG),
      activityLevel: mapActivity(String(r.activity_level ?? '')),
      restingHeartRate: r.resting_heart_rate != null ? Number(r.resting_heart_rate) : null,
      trainingDaysPerWeek: r.training_days_per_week != null ? Number(r.training_days_per_week) : null,
      baselineMetrics: (r.baseline_metrics as Record<string, number>) ?? {},
      notes: s(r.notes),
    };
  },

  async nutritionProfile(userId: string): Promise<NutritionProfile | null> {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data: r } = await sb.from('nutrition_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (!r) return null;
    return {
      userId: String(r.user_id),
      organisationId: String(r.organisation_id ?? ORG),
      dietaryPattern: s(r.dietary_pattern),
      restrictions: Array.isArray(r.restrictions) ? (r.restrictions as string[]) : [],
      intolerances: Array.isArray(r.intolerances) ? (r.intolerances as string[]) : [],
      hydrationTargetMl: r.hydration_target_ml != null ? Number(r.hydration_target_ml) : null,
      notes: s(r.notes),
    };
  },

  async assessments(userId: string): Promise<Assessment[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('assessments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      userId: String(r.user_id),
      organisationId: String(r.organisation_id ?? ORG),
      type: (r.type as Assessment['type']) ?? 'body_mot',
      status: (r.status as Assessment['status']) ?? 'complete',
      title: String(r.title),
      results: (r.results as Record<string, unknown>) ?? {},
      score: r.score != null ? Number(r.score) : null,
      aiSummary: s(r.ai_summary),
      createdBy: s(r.created_by),
      reviewedBy: s(r.reviewed_by),
      reviewedAt: s(r.reviewed_at),
      createdAt: String(r.created_at),
    }));
  },

  async notifications(userId: string): Promise<Notification[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(25);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      organisationId: String(r.organisation_id ?? ORG),
      userId: String(r.user_id),
      type: String(r.type),
      title: String(r.title),
      body: String(r.body ?? ''),
      channel: (r.channel as Notification['channel']) ?? 'in_app',
      data: (r.data as Record<string, unknown>) ?? {},
      readAt: s(r.read_at),
      createdAt: String(r.created_at),
    }));
  },

  /** Mark every unread notification for this user as read. */
  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { error } = await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
    return !error;
  },

  /** All of the member's appointments split into upcoming and past. */
  async appointments(userId: string): Promise<{ upcoming: MemberAppointment[]; past: MemberAppointment[] }> {
    const sb = createAdminClient();
    if (!sb) return { upcoming: [], past: [] };
    const { data } = await sb
      .from('appointments')
      .select('id, service_slug, status, location_type, scheduled_start, scheduled_end, notes')
      .eq('member_id', userId)
      .order('scheduled_start', { ascending: false })
      .limit(50);
    const rows: MemberAppointment[] = (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      serviceSlug: String(r.service_slug ?? 'consultation'),
      status: String(r.status ?? 'requested'),
      locationType: String(r.location_type ?? 'video'),
      scheduledStart: String(r.scheduled_start),
      scheduledEnd: String(r.scheduled_end),
      notes: s(r.notes),
    }));
    const now = Date.now();
    const upcoming = rows
      .filter((a) => new Date(a.scheduledStart).getTime() >= now && a.status !== 'cancelled')
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    const past = rows.filter((a) => new Date(a.scheduledStart).getTime() < now || a.status === 'cancelled');
    return { upcoming, past };
  },

  /** Book a new appointment for the member (status 'requested' until confirmed). */
  async bookAppointment(
    userId: string,
    input: { serviceSlug: string; locationType: string; startIso: string; durationMins: number; notes?: string | null },
  ): Promise<{ ok: boolean; error?: string }> {
    const sb = createAdminClient();
    if (!sb) return { ok: false, error: 'Booking is not available right now.' };
    const start = new Date(input.startIso);
    const end = new Date(start.getTime() + input.durationMins * 60_000);
    const { error } = await sb.from('appointments').insert({
      organisation_id: ORG,
      member_id: userId,
      service_slug: input.serviceSlug,
      status: 'requested',
      location_type: input.locationType,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      notes: input.notes?.trim() || null,
      created_by: userId,
    });
    if (error) return { ok: false, error: 'Could not book the appointment. Please try again.' };
    return { ok: true };
  },

  /** Cancel one of the member's OWN future appointments. */
  async cancelAppointment(userId: string, appointmentId: string): Promise<{ ok: boolean; error?: string }> {
    const sb = createAdminClient();
    if (!sb) return { ok: false, error: 'Not available right now.' };
    const { data, error } = await sb
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .eq('member_id', userId)
      .in('status', ['requested', 'confirmed'])
      .gte('scheduled_start', new Date().toISOString())
      .select('id')
      .maybeSingle();
    if (error || !data) return { ok: false, error: 'This appointment could not be cancelled.' };
    return { ok: true };
  },

  /** Move one of the member's OWN future appointments to a new time. */
  async rescheduleAppointment(
    userId: string,
    appointmentId: string,
    startIso: string,
    durationMins: number,
  ): Promise<{ ok: boolean; error?: string }> {
    const sb = createAdminClient();
    if (!sb) return { ok: false, error: 'Not available right now.' };
    const start = new Date(startIso);
    const end = new Date(start.getTime() + durationMins * 60_000);
    const { data, error } = await sb
      .from('appointments')
      .update({
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        status: 'requested',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('member_id', userId)
      .in('status', ['requested', 'confirmed'])
      .select('id')
      .maybeSingle();
    if (error || !data) return { ok: false, error: 'This appointment could not be moved.' };
    return { ok: true };
  },

  /** Upcoming appointments for the member, soonest first. */
  async upcomingAppointments(userId: string): Promise<UpcomingAppointment[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb
      .from('appointments')
      .select('id, service_slug, status, location_type, scheduled_start, notes')
      .eq('member_id', userId)
      .gte('scheduled_start', new Date().toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(10);
    const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      title: String(r.notes ?? '').trim() || `Appointment · ${String(r.service_slug ?? 'consultation').replaceAll('-', ' ')}`,
      when: fmt.format(new Date(String(r.scheduled_start))),
      type: String(r.location_type ?? 'session'),
      status: String(r.status ?? 'confirmed'),
      scheduledStart: String(r.scheduled_start),
    }));
  },
};
