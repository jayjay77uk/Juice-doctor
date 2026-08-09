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
};
