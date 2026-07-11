'use server';

import { revalidatePath } from 'next/cache';
import { crm } from './crm';
import { specialists } from './specialists';
import type { LeadFollowUp, LeadWhatsapp, LeadStatus } from '@/types/crm';

/**
 * Admin Server Actions for the human-review / takeover workflow on a CRM lead.
 * Each mutates the in-process CRM store and revalidates the affected admin pages.
 */

type ActionOk = { ok: true };
type ActionErr = { ok: false; error: string };
type Res = ActionOk | ActionErr;

function revalidate(id: string): void {
  revalidatePath(`/admin/crm/${id}`);
  revalidatePath('/admin/crm');
  revalidatePath('/admin/receptionist');
}

function wrap(r: { ok: true } | { ok: false; error: { message: string } }, id: string): Res {
  revalidate(id);
  return r.ok ? { ok: true } : { ok: false, error: r.error.message };
}

export async function approveRecommendationAction(id: string): Promise<Res> {
  return wrap(await crm.approveRecommendation(id), id);
}

export async function changeRecommendationAction(id: string, slug: string): Promise<Res> {
  const spec = await specialists.bySlug(slug);
  const name = spec.ok ? spec.data.name : slug;
  return wrap(await crm.changeRecommendation(id, slug, name), id);
}

export async function addNoteAction(id: string, note: string): Promise<Res> {
  if (!note.trim()) return { ok: false, error: 'Please enter a note.' };
  return wrap(await crm.addNote(id, note.trim()), id);
}

export async function assignLeadAction(id: string, admin: string): Promise<Res> {
  if (!admin.trim()) return { ok: false, error: 'Please enter a team member.' };
  return wrap(await crm.assign(id, admin.trim()), id);
}

export async function setFollowUpAction(id: string, status: LeadFollowUp): Promise<Res> {
  return wrap(await crm.setFollowUp(id, status), id);
}

export async function setWhatsappAction(id: string, status: LeadWhatsapp): Promise<Res> {
  return wrap(await crm.setWhatsapp(id, status), id);
}

export async function takeOverAction(id: string, message: string): Promise<Res> {
  if (!message.trim()) return { ok: false, error: 'Please enter a message.' };
  return wrap(await crm.takeOver(id, message.trim()), id);
}

export async function closeReviewAction(id: string): Promise<Res> {
  return wrap(await crm.closeReview(id), id);
}

export async function reopenReviewAction(id: string): Promise<Res> {
  return wrap(await crm.reopenReview(id), id);
}

export async function setLeadStatusAction(id: string, status: LeadStatus): Promise<Res> {
  return wrap(await crm.updateStatus(id, status), id);
}

export async function setReminderAction(id: string, at: string | null): Promise<Res> {
  return wrap(await crm.setReminder(id, at), id);
}
