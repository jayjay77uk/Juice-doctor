import 'server-only';

import { ok, err, type Result } from './result';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from './auth';

/**
 * Customer support tickets over support_tickets (migration 0028; RLS: members
 * manage their own, staff read). No mock data.
 */

export type SupportStatus = 'open' | 'in_progress' | 'resolved';

export interface SupportTicket {
  id: string;
  memberId: string;
  subject: string;
  message: string;
  status: SupportStatus;
  createdAt: string;
}

const ORG = '00000000-0000-0000-0000-000000000001';

async function sessionUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

function rowToTicket(r: Record<string, unknown>): SupportTicket {
  return {
    id: String(r.id),
    memberId: String(r.member_id),
    subject: String(r.subject),
    message: String(r.message),
    status: (r.status as SupportStatus) ?? 'open',
    createdAt: String(r.created_at),
  };
}

export const support = {
  async listForMember(memberId?: string): Promise<Result<SupportTicket[]>> {
    const uid = memberId ?? (await sessionUserId());
    const sb = createAdminClient();
    if (!uid || !sb) return ok([]);
    const { data } = await sb.from('support_tickets').select('*').eq('member_id', uid).order('created_at', { ascending: false });
    return ok((data ?? []).map(rowToTicket));
  },
  async create(input: { memberId?: string; subject: string; message: string }): Promise<Result<SupportTicket>> {
    const subject = input.subject.trim();
    const message = input.message.trim();
    if (!subject || !message) return err({ code: 'invalid', message: 'Please fill in both fields.' });
    const uid = input.memberId ?? (await sessionUserId());
    const sb = createAdminClient();
    if (!uid || !sb) return err({ code: 'unavailable', message: 'Support is not available right now.' });
    const { data, error } = await sb
      .from('support_tickets')
      .insert({ organisation_id: ORG, member_id: uid, subject, message })
      .select('*')
      .single();
    if (error || !data) return err({ code: 'invalid', message: 'Could not create the ticket.' });
    return ok(rowToTicket(data));
  },

  /** Staff view: every ticket, newest first, with the member's email. */
  async listAll(limit = 50): Promise<Result<(SupportTicket & { memberEmail: string })[]>> {
    const sb = createAdminClient();
    if (!sb) return ok([]);
    const { data } = await sb.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(limit);
    const rows = data ?? [];
    const memberIds = [...new Set(rows.map((r) => String(r.member_id)))];
    const emails = new Map<string, string>();
    if (memberIds.length) {
      const { data: profiles } = await sb.from('profiles').select('id, email').in('id', memberIds);
      for (const p of profiles ?? []) emails.set(String(p.id), String(p.email ?? ''));
    }
    return ok(rows.map((r) => ({ ...rowToTicket(r), memberEmail: emails.get(String(r.member_id)) || '(unknown)' })));
  },

  /** Staff status transition (open → in_progress → resolved). */
  async setStatus(id: string, status: SupportStatus): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { data, error } = await sb
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    return !error && Boolean(data);
  },
};
