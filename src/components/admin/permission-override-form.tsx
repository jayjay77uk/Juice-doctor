'use client';
import { useActionState } from 'react';
import { updatePermissionOverride } from '@/services/user-admin-actions';
import { ALL_PERMISSION_KEYS } from '@/config/permissions';
export function PermissionOverrideForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(updatePermissionOverride, { ok: false });
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <input name="id" type="hidden" value={userId} />
      <label className="flex flex-col gap-1">
        Permission
        <select name="permission" className="bg-surface rounded border p-2">
          {ALL_PERMISSION_KEYS.map((key) => (
            <option key={key}>{key}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Effect
        <select name="effect" className="bg-surface rounded border p-2">
          <option value="deny">Deny</option>
          <option value="grant">Grant</option>
          <option value="inherit">Restore role default</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Expiry (optional, UTC)
        <input name="expires" type="datetime-local" className="bg-surface rounded border p-2" />
      </label>
      <label className="flex flex-col gap-1">
        Reason
        <textarea
          name="reason"
          required
          minLength={5}
          maxLength={500}
          className="bg-surface rounded border p-2"
        />
      </label>
      <button disabled={pending} className="bg-primary rounded p-2 text-white">
        {pending ? 'Saving…' : 'Save override'}
      </button>
      {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
    </form>
  );
}
