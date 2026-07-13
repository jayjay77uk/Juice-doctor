'use server';

import { revalidatePath } from 'next/cache';
import { assertSession } from '@/lib/auth/authorize';
import { memoryRepo } from './repositories/memory-repo';
import { setMemoryEnabled } from './memory-prefs';

/**
 * Person-facing memory controls (view is a page read; these mutate). Each is
 * authenticated and scoped to the signed-in person's own memories.
 */

export async function forgetMemoryAction(id: string): Promise<{ ok: boolean }> {
  let userId: string;
  try { userId = (await assertSession()).user.id; } catch { return { ok: false }; }
  const ok = await memoryRepo.forget(userId, id);
  if (ok) revalidatePath('/dashboard/settings');
  return { ok };
}

export async function forgetAllMemoryAction(): Promise<{ ok: boolean; removed: number }> {
  let userId: string;
  try { userId = (await assertSession()).user.id; } catch { return { ok: false, removed: 0 }; }
  const removed = await memoryRepo.forgetAll(userId);
  revalidatePath('/dashboard/settings');
  return { ok: true, removed };
}

export async function setMemoryEnabledAction(enabled: boolean): Promise<{ ok: boolean }> {
  try { await assertSession(); } catch { return { ok: false }; }
  const ok = await setMemoryEnabled(enabled);
  // Disabling memory also clears what is already stored.
  if (ok && !enabled) await forgetAllMemoryAction();
  if (ok) revalidatePath('/dashboard/settings');
  return { ok };
}
