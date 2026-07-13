'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/authorize';
import { setSharedDna } from './admin';

/**
 * Edit the HERNE shared DNA — the values every specialist upholds. Administrator
 * only. Stored in system_settings and read by the runtime prompt assembler, so a
 * change here changes every specialist's behaviour immediately.
 */
export async function saveSharedDnaAction(items: string[]): Promise<{ ok: boolean; dna: string[]; reason?: string }> {
  try {
    await assertRole('administrator');
  } catch {
    return { ok: false, dna: items, reason: 'forbidden' };
  }
  const result = await setSharedDna(items);
  if (result.ok) {
    revalidatePath('/admin/herne/dna');
    revalidatePath('/specialists');
  }
  return result;
}
