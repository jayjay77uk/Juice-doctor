'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Rocket, RotateCcw } from 'lucide-react';
import type { PromptVersion } from '@/types/ai-platform';
import { savePromptDraftAction, publishPromptVersionAction, rollbackPromptAction } from '@/services/admin-actions';
import { idleAction } from '@/services/result';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Panel } from './panel';
import { StatusBadge } from './status-badge';

function SaveDraft() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save as new draft'}
    </Button>
  );
}

export function PromptEditor({
  promptId,
  currentContent,
  currentVersion,
  versions,
}: {
  promptId: string;
  currentContent: string;
  currentVersion: number;
  versions: PromptVersion[];
}) {
  const [state, formAction] = useActionState(savePromptDraftAction, idleAction);

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Editor" description="Editing creates a new draft version. Publish to make it live.">
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="promptId" value={promptId} />
          {state.status === 'success' && (
            <p className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-sm text-secondary" role="status">
              <Check className="size-4" /> {state.message}
            </p>
          )}
          <Field label="Content" name="content" error={state.status === 'error' ? state.fieldErrors?.content?.[0] : undefined}>
            <Textarea id="content" name="content" rows={12} defaultValue={currentContent} className="font-mono text-sm" />
          </Field>
          <Field label="Change note" name="changeNote">
            <Input id="changeNote" name="changeNote" placeholder="What changed and why?" />
          </Field>
          <SaveDraft />
        </form>
      </Panel>

      <Panel title="Version history" description={`Currently published: v${currentVersion}`} padded={false}>
        <ul className="divide-y divide-border">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-col gap-3 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Version {v.version}</span>
                  <StatusBadge status={v.publishStatus} />
                  {v.version === currentVersion && <StatusBadge status="active" tone="teal" />}
                </div>
                <div className="flex items-center gap-2">
                  {v.version !== currentVersion && (
                    <form action={publishPromptVersionAction}>
                      <input type="hidden" name="promptId" value={promptId} />
                      <input type="hidden" name="version" value={v.version} />
                      <button type="submit" className="inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted">
                        <Rocket className="size-3.5" /> Publish
                      </button>
                    </form>
                  )}
                  {v.version < currentVersion && (
                    <form action={rollbackPromptAction}>
                      <input type="hidden" name="promptId" value={promptId} />
                      <input type="hidden" name="version" value={v.version} />
                      <button type="submit" className="inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted">
                        <RotateCcw className="size-3.5" /> Roll back
                      </button>
                    </form>
                  )}
                </div>
              </div>
              {v.changeNote && <p className="text-xs text-muted-foreground">{v.changeNote}</p>}
              <details className="group">
                <summary className="cursor-pointer text-xs text-primary hover:underline">View content</summary>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs text-foreground">{v.content}</pre>
              </details>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
