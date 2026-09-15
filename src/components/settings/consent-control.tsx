'use client';
import { useActionState } from 'react';
import { changeConsentAction } from '@/services/consent-actions';
import type { ManagedConsent } from '@/services/consents';
import { Button } from '@/components/ui/button';

export function ConsentControl({ type, label, granted }: { type: ManagedConsent; label: string; granted: boolean }) {
  const [state, action, pending] = useActionState(changeConsentAction, { message: '' });
  return <form action={action} className="flex flex-col gap-2 rounded-xl border border-border p-4">
    <input type="hidden" name="type" value={type} />
    <input type="hidden" name="granted" value={String(!granted)} />
    <p className="font-medium">{label}</p>
    <p className="text-sm text-muted-foreground">{granted ? 'Allowed' : 'Not allowed'}</p>
    <Button type="submit" intent="outline" disabled={pending}>{pending ? 'Saving…' : granted ? 'Withdraw consent' : 'Give consent'}</Button>
    {state.message && <p role="status" className="text-sm">{state.message}</p>}
  </form>;
}
