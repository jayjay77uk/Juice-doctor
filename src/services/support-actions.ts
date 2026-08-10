'use server';

import { revalidatePath } from 'next/cache';
import { support } from './support';
import type { ActionResult } from './result';
import { assertSession } from '@/lib/auth/authorize';

/** Customer support request — creates a real support ticket for staff review (no email is sent; there is no email provider). */
export async function createSupportTicketAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try { await assertSession(); } catch { return { status: 'error', message: 'Please sign in to submit a support request.' }; }
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  if (!subject) return { status: 'error', message: 'Please add a subject.' };
  if (!message) return { status: 'error', message: 'Please describe how we can help.' };
  const result = await support.create({ subject, message });
  if (!result.ok) return { status: 'error', message: result.error.message };
  revalidatePath('/dashboard/support');
  return { status: 'success', message: 'Thanks — your request has been logged and a member of the team will follow up.' };
}
