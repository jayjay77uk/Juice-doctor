'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { createPlanAction } from '@/services/subscription-actions';
import { idleAction } from '@/services/result';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create plan'}
    </Button>
  );
}

/**
 * Create-plan form — admin defines a plan by ACCESS SCOPE (one / selected /
 * all specialists). No price is set here; the plan's priceLabel stays a
 * placeholder ("Price on request") until the client configures pricing later.
 */
export function CreatePlanForm({
  specialists,
}: {
  specialists: { slug: string; name: string }[];
}) {
  const [state, formAction] = useActionState(createPlanAction, idleAction);
  const [scope, setScope] = React.useState<'single' | 'multiple' | 'all'>('single');

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === 'error' && (
        <p className="inline-flex items-center gap-2 rounded-xl bg-[#f6e3e0] px-4 py-2.5 text-sm text-danger" role="alert">
          <AlertCircle className="size-4" /> {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <p className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 text-sm text-secondary" role="status">
          <CheckCircle2 className="size-4" /> {state.message}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Name</span>
        <input name="name" required placeholder="e.g. Selected specialists" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Description</span>
        <textarea name="description" rows={2} placeholder="What does this plan grant access to?" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Scope</span>
        <select
          name="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as 'single' | 'multiple' | 'all')}
          className={inputClass}
        >
          <option value="single">Single specialist</option>
          <option value="multiple">Selected specialists</option>
          <option value="all">All specialists</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Specialist slugs</span>
        <textarea
          name="specialistSlugs"
          rows={2}
          disabled={scope === 'all'}
          placeholder="makela, serena"
          className={`${inputClass} disabled:opacity-55`}
        />
        <span className="text-xs text-muted-foreground">
          Comma or newline separated specialist slugs — ignored for the &ldquo;All specialists&rdquo; scope.
        </span>
        {specialists.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Available: {specialists.map((s) => s.slug).join(', ')}
          </span>
        )}
      </label>

      <div className="flex items-center gap-4">
        <Submit />
        <p className="text-xs text-muted-foreground">
          No price is set here — pricing is configurable later. New plans show &ldquo;Price on request&rdquo;.
        </p>
      </div>
    </form>
  );
}
