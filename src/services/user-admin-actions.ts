'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { assertPermission } from '@/lib/auth/authorize';
import { APP_ROLES } from '@/lib/auth/roles';
import { mayManageUser } from '@/lib/auth/user-management';
import { createAdminClient } from '@/lib/supabase/admin';
import { auditRepo } from './repositories/audit-repo';

export type UserUpdateResult = { ok: boolean; message?: string };
const schema = z.object({
  id: z.string().uuid(), role: z.enum(APP_ROLES),
  status: z.enum(['active', 'suspended', 'deactivated']),
  reason: z.string().trim().min(5).max(500),
});

export async function updateUserAccess(_previous: UserUpdateResult, form: FormData): Promise<UserUpdateResult> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: 'Choose a role, status and a reason of 5–500 characters.' };
  try {
    const { user } = await assertPermission('users.update');
    await assertPermission('roles.assign');
    if (parsed.data.status === 'deactivated') await assertPermission('users.delete');
    const sb = createAdminClient();
    if (!sb || !user.organisationId) return { ok: false, message: 'User management is unavailable.' };
    const { data: target, error } = await sb.from('profiles').select('id, role, status, organisation_id, updated_at')
      .eq('id', parsed.data.id).eq('organisation_id', user.organisationId).maybeSingle();
    const role = z.enum(APP_ROLES).safeParse(target?.role);
    if (error || !target || !role.success || !mayManageUser(user, {
      id: target.id, role: role.data, organisationId: target.organisation_id,
    }, parsed.data.role)) return { ok: false, message: 'You cannot change your own account, peers, owners or another organisation’s users.' };
    const changes = { role: parsed.data.role, status: parsed.data.status };
    // Optimistic concurrency: do not overwrite an intervening role/status edit.
    const result = await sb.from('profiles').update(changes).eq('id', target.id)
      .eq('organisation_id', user.organisationId).eq('updated_at', target.updated_at).select('id').maybeSingle();
    if (result.error || !result.data) return { ok: false, message: 'The update failed or the account changed. Refresh and retry.' };
    await auditRepo.log({ actorId: user.id, action: 'users.access_updated', entityType: 'profile', entityId: target.id,
      before: { role: target.role, status: target.status }, after: { ...changes, reason: parsed.data.reason } });
    revalidatePath('/admin/users');
    return { ok: true, message: 'Access updated. The new status applies on the next authenticated request.' };
  } catch {
    return { ok: false, message: 'Not authorised or user management is unavailable.' };
  }
}
