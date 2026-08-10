'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveSpecialistVoicesAction } from '@/services/voice-actions';
import { idleAction } from '@/services/result';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground outline-none focus-visible:border-primary';

/** Per-specialist ElevenLabs voice-id configuration (inert until connected). */
export function SpecialistVoicesForm({ specialists, voices }: { specialists: string[]; voices: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSpecialistVoicesAction, idleAction);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {specialists.map((slug) => (
          <label key={slug} className="flex items-center gap-2 text-sm text-foreground">
            <span className="w-20 shrink-0 capitalize">{slug}</span>
            <input name={`voice_${slug}`} defaultValue={voices[slug] ?? ''} maxLength={64} className={inputClass} placeholder="ElevenLabs voice id" />
          </label>
        ))}
      </div>
      {state.status !== 'idle' && state.message && (
        <p className={state.status === 'error' ? 'text-sm text-danger' : 'text-sm text-secondary'} role="status">
          {state.message}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save voice configuration
        </Button>
      </div>
    </form>
  );
}
