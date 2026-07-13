'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ACTION_STATUS_LABELS, type ActionStatus } from '@/services/herne/care-plan-states';
import { acceptCarePlanActionAction, declineCarePlanActionAction, completeCarePlanActionAction } from '@/services/herne/care-plan-actions';

export interface CarePlanActionView {
  id: string;
  title: string;
  specialistName: string;
  status: ActionStatus;
  evidenceRefs: string[];
}

function statusTone(status: ActionStatus): 'neutral' | 'primary' | 'secondary' | 'accent' | 'outline' {
  if (status === 'proposed') return 'accent';
  if (status === 'user_accepted' || status === 'active') return 'primary';
  if (status === 'completed') return 'secondary';
  if (status === 'requires_human_review') return 'accent';
  return 'outline';
}

export function CarePlanActionList({ actions }: { actions: CarePlanActionView[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(id: string, fn: () => Promise<{ ok: boolean }>) {
    setBusy(id);
    const res = await fn();
    setBusy(null);
    if (res.ok) router.refresh();
  }

  return (
    <ul className="divide-y divide-border">
      {actions.map((a) => {
        const done = a.status === 'completed' || a.status === 'declined' || a.status === 'superseded';
        return (
          <li key={a.id} className="flex flex-col gap-2 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <span className={`mt-1 size-2 shrink-0 rounded-full ${a.status === 'completed' ? 'bg-secondary' : a.status === 'proposed' ? 'bg-amber-400' : done ? 'bg-border-strong' : 'bg-primary'}`} />
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${done && a.status !== 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.specialistName}
                  {a.evidenceRefs.length ? ` · evidence ${a.evidenceRefs.join(', ')}` : ''}
                </p>
              </div>
              <Badge tone={statusTone(a.status)}>{ACTION_STATUS_LABELS[a.status]}</Badge>
            </div>
            {(a.status === 'proposed' || a.status === 'active') && (
              <div className="flex flex-wrap gap-2 pl-5">
                {a.status === 'proposed' && (
                  <>
                    <Button size="sm" onClick={() => run(a.id, () => acceptCarePlanActionAction(a.id))} disabled={busy === a.id}>
                      <Check className="size-4" /> Accept
                    </Button>
                    <Button size="sm" intent="ghost" onClick={() => run(a.id, () => declineCarePlanActionAction(a.id))} disabled={busy === a.id}>
                      <X className="size-4" /> Decline
                    </Button>
                  </>
                )}
                {a.status === 'active' && (
                  <Button size="sm" intent="outline" onClick={() => run(a.id, () => completeCarePlanActionAction(a.id))} disabled={busy === a.id}>
                    <CheckCircle2 className="size-4" /> Mark complete
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
