'use server';

import { revalidatePath } from 'next/cache';
import { receptionistSettings, currentReceptionistSettings } from './receptionist-settings';
import type { ActionResult } from './result';

/**
 * Admin Server Action for editing the Receptionist AI settings. Reads a FormData
 * payload from the settings form and updates the runtime settings store, so the
 * live receptionist flow reflects the change with no code change.
 */
export async function updateReceptionistSettingsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const cur = currentReceptionistSettings();

  const greeting = String(formData.get('greeting') ?? '').trim();
  const tone = String(formData.get('tone') ?? '').trim();
  const escalationRule = String(formData.get('escalationRule') ?? '').trim();
  const whatsappNumber = String(formData.get('whatsappNumber') ?? '').trim();
  const escalationName = String(formData.get('escalationName') ?? '').trim();
  const escalationRole = String(formData.get('escalationRole') ?? '').trim();
  const active = formData.get('active') === 'on';
  const whatsappEnabled = formData.get('whatsappEnabled') === 'on';

  if (!greeting) return { status: 'error', message: 'Please enter a greeting.' };

  const thresholdRaw = Number(formData.get('confidenceThreshold'));
  const confidenceThreshold = Number.isFinite(thresholdRaw)
    ? Math.min(100, Math.max(0, thresholdRaw)) / 100
    : cur.confidenceThreshold;

  const questions = cur.questions.map((q) => {
    const prompt = String(formData.get(`question_${q.id}`) ?? q.prompt).trim();
    return { ...q, prompt: prompt || q.prompt };
  });

  await receptionistSettings.update({
    active,
    greeting,
    tone: tone || cur.tone,
    escalationRule: escalationRule || cur.escalationRule,
    confidenceThreshold,
    whatsappEnabled,
    whatsappNumber: whatsappNumber || cur.whatsappNumber,
    questions,
    escalationTarget: {
      ...cur.escalationTarget,
      name: escalationName || cur.escalationTarget.name,
      role: escalationRole || cur.escalationTarget.role,
    },
  });

  revalidatePath('/admin/receptionist');
  revalidatePath('/assistant');
  return { status: 'success', message: 'Receptionist settings saved.' };
}
