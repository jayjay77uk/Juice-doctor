import 'server-only';

import { ok, type Result } from './result';

/**
 * Customer support tickets. Prototype in-process store; production persists to a
 * support table and notifies the team. No message is actually sent.
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

const MEMBER = 'usr_member';
let counter = 0;

function nowIso(): string {
  return new Date().toISOString();
}

const tickets: SupportTicket[] = [
  { id: 'ticket_1', memberId: MEMBER, subject: 'Getting started', message: 'How do I begin with my specialist AI?', status: 'resolved', createdAt: '2026-07-05T09:00:00.000Z' },
];

export const support = {
  async listForMember(memberId = MEMBER): Promise<Result<SupportTicket[]>> {
    return ok(tickets.filter((t) => t.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },
  async create(input: { memberId?: string; subject: string; message: string }): Promise<Result<SupportTicket>> {
    const ticket: SupportTicket = {
      id: `ticket_new_${++counter}`,
      memberId: input.memberId ?? MEMBER,
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: 'open',
      createdAt: nowIso(),
    };
    tickets.unshift(ticket);
    return ok(ticket);
  },
};
