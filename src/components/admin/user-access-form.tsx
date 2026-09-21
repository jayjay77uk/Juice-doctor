'use client';
import { useActionState } from 'react';
import { updateUserAccess } from '@/services/user-admin-actions';
import type { Profile } from '@/types/identity';
import { APP_ROLES, ROLE_META, ROLE_RANK, type AppRole } from '@/lib/auth/roles';

export function UserAccessForm({ profile, actorRole }: { profile: Profile; actorRole: AppRole }) {
  const [state, action, pending] = useActionState(updateUserAccess, { ok: false });
  return <details>
    <summary className="cursor-pointer text-primary">Edit access</summary>
    <form action={action} className="mt-3 flex min-w-52 flex-col gap-3">
      <input type="hidden" name="id" value={profile.id} />
      <label className="flex flex-col gap-1">Role
        <select name="role" defaultValue={profile.role} className="rounded border bg-surface p-2">
          {APP_ROLES.filter(role => role !== 'guest' && ROLE_RANK[role] < ROLE_RANK[actorRole]).map(role =>
            <option key={role} value={role}>{ROLE_META[role].label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">Status
        <select name="status" defaultValue={profile.status === 'invited' ? 'active' : profile.status} className="rounded border bg-surface p-2">
          <option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">Reason
        <textarea name="reason" required minLength={5} maxLength={500} className="rounded border bg-surface p-2" />
      </label>
      <p className="text-xs text-muted-foreground">Suspending or deactivating blocks subsequent application requests. It does not delete the account.</p>
      <button disabled={pending} className="rounded bg-primary p-2 text-white">{pending ? 'Saving…' : 'Save access'}</button>
      {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
    </form>
  </details>;
}
