'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/authorize';
import { saveSpecialistVoices } from './voice';
import { auditRepo } from './repositories/audit-repo';
import { HERNE_ORDER } from '@/data/herne/specialist-profiles';
import type { ActionResult } from './result';

/** Save per-specialist ElevenLabs voice ids (admin). Validated + audited. */
export async function saveSpecialistVoicesAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = (await assertRole('administrator')).user.id;
  } catch {
    return { status: 'error', message: 'Not authorised.' };
  }
  const map: Record<string, string> = {};
  for (const slug of HERNE_ORDER) {
    const value = String(formData.get(`voice_${slug}`) ?? '').trim();
    if (value) map[slug] = value;
  }
  const saved = await saveSpecialistVoices(map);
  if (!saved) return { status: 'error', message: 'Could not save the voice configuration.' };
  await auditRepo.log({ actorId, action: 'voice.specialist_voices_saved', entityType: 'system_settings', after: { specialists: Object.keys(map) } });
  revalidatePath('/admin/integrations');
  return { status: 'success', message: 'Voice configuration saved. Voices take effect once ElevenLabs is connected.' };
}
