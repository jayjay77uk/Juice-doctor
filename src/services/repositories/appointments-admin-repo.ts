import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Admin read/confirm layer over appointments. The member books ('requested');
 * the team confirms, completes or cancels here. Names resolved from profiles.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

export interface AdminAppointment {
  id: string;
  memberId: string;
  memberName: string;
  serviceSlug: string;
  status: string;
  locationType: string;
  scheduledStart: string;
  notes: string | null;
}

export const appointmentsAdminRepo = {
  async list(limit = 50): Promise<AdminAppointment[]> {
    const sb = createAdminClient();
    if (!sb) return [];
    const { data } = await sb
      .from('appointments')
      .select('id, member_id, service_slug, status, location_type, scheduled_start, notes')
      .eq('organisation_id', ORG)
      .order('scheduled_start', { ascending: true })
      .gte('scheduled_start', new Date(Date.now() - 7 * 86_400_000).toISOString())
      .limit(limit);
    const rows = data ?? [];
    const memberIds = [...new Set(rows.map((r) => String(r.member_id)))];
    const names = new Map<string, string>();
    if (memberIds.length) {
      const { data: profiles } = await sb.from('profiles').select('id, full_name, email').in('id', memberIds);
      for (const p of profiles ?? []) names.set(String(p.id), String(p.full_name || p.email || 'Member'));
    }
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      memberId: String(r.member_id),
      memberName: names.get(String(r.member_id)) ?? 'Member',
      serviceSlug: String(r.service_slug ?? 'consultation'),
      status: String(r.status ?? 'requested'),
      locationType: String(r.location_type ?? 'video'),
      scheduledStart: String(r.scheduled_start),
      notes: (r.notes as string | null) ?? null,
    }));
  },

  async setStatus(appointmentId: string, status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { data, error } = await sb
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .select('id')
      .maybeSingle();
    return !error && Boolean(data);
  },
};
