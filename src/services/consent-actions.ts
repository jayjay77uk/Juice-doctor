'use server';
import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/admin';

export async function changeConsentAction(_previous: { message: string }, form: FormData) {
  const { user } = await assertSession();
  const type = form.get('type');
  const choice = form.get('granted');
  if ((type !== 'ai_processing' && type !== 'health_data_sharing') || (choice !== 'true' && choice !== 'false')) return { message: 'Invalid consent choice.' };
  const sb = createAdminClient();
  if (!sb) return { message: 'Consent could not be saved. Please try again.' };
  const { error } = await sb.from('user_consents').insert({ user_id: user.id, consent_type: type, granted: choice === 'true', document_version: 'member-controls-2026-09-15' });
  if (error) return { message: 'Consent could not be saved. Please try again.' };
  revalidatePath('/dashboard/settings');
  revalidatePath('/practitioner');
  return { message: choice === 'true' ? 'Consent granted.' : 'Consent withdrawn. Previously stored records are retained; no new use is authorised by this consent.' };
}
