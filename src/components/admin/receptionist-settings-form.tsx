'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateReceptionistSettingsAction } from '@/services/receptionist-config-actions';
import { idleAction } from '@/services/result';
import type { ReceptionistSettings } from '@/config/receptionist';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

function LabelledField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Saving…' : 'Save settings'}
    </Button>
  );
}

export function ReceptionistSettingsForm({ settings }: { settings: ReceptionistSettings }) {
  const [state, formAction] = useActionState(updateReceptionistSettingsAction, idleAction);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="active" defaultChecked={settings.active} className="size-4" />
        Receptionist is active
      </label>

      <LabelledField label="Greeting" hint="The first message every visitor sees.">
        <textarea name="greeting" defaultValue={settings.greeting} rows={3} className={inputClass} />
      </LabelledField>

      <LabelledField label="Tone">
        <input name="tone" defaultValue={settings.tone} className={inputClass} />
      </LabelledField>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Consultation questions
        </legend>
        {settings.questions.map((q, i) => (
          <label key={q.id} className="flex flex-col gap-1.5">
            <span className="text-sm text-foreground">Question {i + 1}</span>
            <textarea name={`question_${q.id}`} defaultValue={q.prompt} rows={2} className={inputClass} />
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabelledField label="Confidence threshold (%)" hint="Below this, the receptionist escalates to a human.">
          <input
            type="number"
            name="confidenceThreshold"
            min={0}
            max={100}
            defaultValue={Math.round(settings.confidenceThreshold * 100)}
            className={inputClass}
          />
        </LabelledField>
        <LabelledField label="WhatsApp number">
          <input name="whatsappNumber" defaultValue={settings.whatsappNumber} className={inputClass} />
        </LabelledField>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="whatsappEnabled" defaultChecked={settings.whatsappEnabled} className="size-4" />
        Offer WhatsApp handoff
      </label>

      <LabelledField label="Escalation rule">
        <textarea name="escalationRule" defaultValue={settings.escalationRule} rows={2} className={inputClass} />
      </LabelledField>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabelledField label="Escalation target — name">
          <input name="escalationName" defaultValue={settings.escalationTarget.name} className={inputClass} />
        </LabelledField>
        <LabelledField label="Escalation target — role">
          <input name="escalationRole" defaultValue={settings.escalationTarget.role} className={inputClass} />
        </LabelledField>
      </div>

      <div className="flex items-center gap-3">
        <SaveButton />
        {state.status === 'success' && <p className="text-sm text-secondary">{state.message}</p>}
        {state.status === 'error' && (
          <p className="text-sm text-danger" role="alert">
            {state.message}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        These settings are saved to the platform database and drive the live receptionist. Wording is not yet final client-approved copy.
      </p>
    </form>
  );
}
