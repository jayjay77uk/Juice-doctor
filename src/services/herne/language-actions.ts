'use server';

import { revalidatePath } from 'next/cache';
import { saveLanguagePreference } from './language-store';
import { resolveLanguagePreference, type LanguagePreference } from './language';

/**
 * Save the signed-in person's language & voice preference from the settings card.
 * Validation happens in `resolveLanguagePreference` (unknown language → default,
 * dialect kept only if it belongs to the language), so the action trusts nothing
 * from the form. Voice remains a stored *desire*; the capability is still planned.
 */
export async function saveLanguagePreferenceAction(input: {
  language: string;
  dialect: string | null;
  voice: boolean;
}): Promise<{ ok: boolean; preference: LanguagePreference; reason?: string }> {
  const result = await saveLanguagePreference(input);
  if (result.ok) {
    revalidatePath('/dashboard/settings');
    revalidatePath('/assistant');
  }
  // Never surface a partial value: echo the validated preference either way.
  return { ...result, preference: result.preference ?? resolveLanguagePreference(input) };
}
