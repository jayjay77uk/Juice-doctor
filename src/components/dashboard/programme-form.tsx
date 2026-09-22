'use client';
import { useActionState, type ReactNode } from 'react';
import { manageProgramme, completeProgrammeModule } from '@/services/programme-actions';
export function ProgrammeForm({
  children,
  progress = false,
  label = 'Save',
}: {
  children: ReactNode;
  progress?: boolean;
  label?: string;
}) {
  const [state, action, pending] = useActionState(
    progress ? completeProgrammeModule : manageProgramme,
    { ok: false },
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      {children}
      <button disabled={pending} className="bg-primary self-start rounded px-4 py-2 text-white">
        {pending ? 'Saving…' : label}
      </button>
      {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
    </form>
  );
}
