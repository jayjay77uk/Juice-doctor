import 'server-only';

import { ok, err, type Result } from './result';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { getSession } from './auth';

/**
 * Customer support tickets. PRODUCTION: persisted to support_tickets (migration
 * 0028, RLS: members manage their own, staff read). The in-process store below
 * remains only as the local preview fallback.
 */

const ORG = '00000000-0000-0000-0000-000000000001';

export type SupportStatus = 'open' | 'in_progress' | 'resolved';

export interface SupportTicket {
  id: string;
  memberId: string;
  subject: string;
  message: string;
  status: SupportStatus;
  createdAt: string;
}

const MEMBER = 'usr_member';
let counter = 0;

function nowIso(): string {
  return new Date().toISOString();
}

const tickets: SupportTicket[] = [
  { id: 'ticket_1', memberId: MEMBER, subject: 'Getting started', message: 'How do I begin with my specialist AI?', status: 'resolved', createdAt: '2026-07-05T09:00:00.000Z' },
];

async function sessionUserId(): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;
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
    if (uid && sb && isSupabaseAdminConfigured()) {
      const { data } = await sb.from('support_tickets').select('*').eq('member_id', uid).order('created_at', { ascending: false });
      return ok((data ?? []).map(rowToTicket));
    }
    const key = memberId ?? MEMBER;
    return ok(tickets.filter((t) => t.memberId === key).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async create(input: { memberId?: string; subject: string; message: string }): Promise<Result<SupportTicket>> {
    const subject = input.subject.trim();
    const message = input.message.trim();
    if (!subject || !message) return err({ code: 'invalid', message: 'Please fill in both fields.' });
    const uid = input.memberId ?? (await sessionUserId());
    const sb = createAdminClient();
    if (uid && sb && isSupabaseAdminConfigured()) {
      const { data, error } = await sb
        .from('support_tickets')
        .insert({ organisation_id: ORG, member_id: uid, subject, message })
        .select('*')
        .single();
      if (error || !data) return err({ code: 'invalid', message: 'Could not create the ticket.' });
      return ok(rowToTicket(data));
    }
    const ticket: SupportTicket = {
      id: `ticket_new_${++counter}`,
      memberId: input.memberId ?? MEMBER,
      subject,
      message,
      status: 'open',
      createdAt: nowIso(),
    };
    tickets.unshift(ticket);
    return ok(ticket);
  },
};
