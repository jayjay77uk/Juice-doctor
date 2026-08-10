'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Loader2, UserPlus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inviteUserAction, type InviteResult } from '@/services/invitation-actions';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

const idle: InviteResult = { ok: false };

/** Invite a user: real account + role + one-time password-setup link. */
export function InviteUserForm() {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(inviteUserAction, idle);
  const [copied, setCopied] = React.useState(false);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Invite user
      </Button>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-4">
      {state.ok && state.setupUrl ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-secondary" role="status">
            Account created.{' '}
            {state.emailQueued
              ? 'The invitation email is in the outbox and sends once email is connected — until then, share this link yourself:'
              : 'Share this one-time password-setup link with them:'}
          </p>
          <code className="break-all rounded-lg bg-surface-muted px-3 py-2 text-xs text-foreground">{state.setupUrl}</code>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              intent="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(state.setupUrl ?? '').then(() => setCopied(true));
              }}
            >
              <Copy className="size-4" /> {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">This link is shown once and expires — it is not stored by the platform.</p>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Email
              <input name="email" type="email" required maxLength={254} className={inputClass} placeholder="person@example.com" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Role
              <select name="role" className={inputClass} defaultValue="member">
                <option value="member">Member</option>
                <option value="practitioner">Practitioner</option>
                <option value="staff">Staff</option>
                <option value="administrator">Administrator</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Full name (optional)
            <input name="fullName" maxLength={120} className={inputClass} />
          </label>
          {!state.ok && state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Create account
            </Button>
            <Button type="button" intent="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
