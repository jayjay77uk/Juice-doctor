'use client';
import { useActionState } from 'react';
import { saveJournalAction, archiveJournalAction, selectJourneyAction } from '@/services/journal-actions';
import type { JournalEntry } from '@/lib/journal';
import { ONBOARDING_GOALS } from '@/lib/onboarding';
import { Button } from '@/components/ui/button';

const control = 'rounded-xl border border-border bg-surface p-3 text-foreground';
export function JournalForm({ entry, today }: { entry?: JournalEntry; today: string }) {
  const [state, action, pending] = useActionState(saveJournalAction, { message: '' });
  const [archive, archiveAction, archiving] = useActionState(archiveJournalAction, { message: '' });
  return <div className="flex flex-col gap-3">
    <form action={action} className="flex flex-col gap-3">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <label className="flex flex-col gap-1">Date<input className={control} name="entryDate" type="date" required defaultValue={entry?.entry_date ?? today} /></label>
      <label className="flex flex-col gap-1">Title<input className={control} name="title" required maxLength={120} defaultValue={entry?.title ?? ''} /></label>
      <label className="flex flex-col gap-1">Entry<textarea className={control} name="body" required maxLength={5000} rows={5} defaultValue={entry?.body ?? ''} /></label>
      <Button disabled={pending}>{pending ? 'Saving…' : entry ? 'Save changes' : 'Save entry'}</Button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
    {entry && <form action={archiveAction}>
      <input type="hidden" name="id" value={entry.id} />
      <Button intent="ghost" disabled={archiving}>{archiving ? 'Archiving…' : 'Archive entry'}</Button>
      {archive.message && <p role="status">{archive.message}</p>}
    </form>}
  </div>;
}

export function JourneySelection({ focus }: { focus: string }) {
  const [state, action, pending] = useActionState(selectJourneyAction, { message: '' });
  return <form action={action} className="flex flex-col gap-3">
    <label className="flex flex-col gap-1">Current wellbeing focus<select className={control} name="focus" defaultValue={focus} required>
      <option value="" disabled>Choose your focus</option>
      {ONBOARDING_GOALS.map(goal => <option key={goal.key} value={goal.key}>{goal.label}</option>)}
    </select></label>
    <Button disabled={pending}>{pending ? 'Saving…' : 'Save focus'}</Button>
    {state.message && <p role="status">{state.message}</p>}
  </form>;
}
