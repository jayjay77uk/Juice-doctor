'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { journalSchema } from '@/lib/journal';
import { ONBOARDING_GOALS } from '@/lib/onboarding';

export async function saveJournalAction(_previous: { message: string }, form: FormData) {
  const { user } = await assertSession();
  const parsed = journalSchema.safeParse({ id: form.get('id') || undefined, entryDate: form.get('entryDate'), title: form.get('title'), body: form.get('body') });
  if (!parsed.success) return { message: 'Enter a valid date, title (up to 120 characters), and entry (up to 5,000 characters).' };
  const sb = await createSupabaseServerClient();
  if (!sb) return { message: 'Journal unavailable. Please try again.' };
  const { id, entryDate, title, body } = parsed.data;
  const values = { entry_date: entryDate, title, body, updated_at: new Date().toISOString() };
  const result = id
    ? await sb.from('member_journal').update(values).eq('id', id).eq('user_id', user.id).is('archived_at', null).select('id').single()
    : await sb.from('member_journal').insert({ ...values, user_id: user.id }).select('id').single();
  if (result.error || !result.data) return { message: 'Your entry could not be saved. Please try again.' };
  revalidatePath('/dashboard/journal');
  return { message: 'Entry saved.' };
}

export async function archiveJournalAction(_previous: { message: string }, form: FormData) {
  const { user } = await assertSession();
  const id = z.string().uuid().safeParse(form.get('id'));
  if (!id.success) return { message: 'Entry not found.' };
  const sb = await createSupabaseServerClient();
  if (!sb) return { message: 'Journal unavailable.' };
  const { data, error } = await sb.from('member_journal').update({ archived_at: new Date().toISOString() })
    .eq('id', id.data).eq('user_id', user.id).is('archived_at', null).select('id').single();
  if (error || !data) return { message: 'Entry could not be archived.' };
  revalidatePath('/dashboard/journal');
  return { message: 'Entry archived. It remains included in your account export.' };
}

export async function selectJourneyAction(_previous: { message: string }, form: FormData) {
  const { user } = await assertSession();
  const focus = form.get('focus');
  if (!ONBOARDING_GOALS.some(goal => goal.key === focus)) return { message: 'Choose a wellbeing focus.' };
  const sb = await createSupabaseServerClient();
  if (!sb) return { message: 'Journey unavailable.' };
  const { error } = await sb.from('member_journeys').upsert({ user_id: user.id, focus, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return { message: 'Your focus could not be saved.' };
  revalidatePath('/dashboard/journey');
  return { message: 'Focus saved. Your specialists can use it in future conversations when AI processing is allowed.' };
}
