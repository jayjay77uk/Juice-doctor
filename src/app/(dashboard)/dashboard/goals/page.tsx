import Link from 'next/link';
import { Plus, Target } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { member } from '@/services/member';

export const metadata = createMetadata({ title: 'My goals', path: '/dashboard/goals' });

export default async function GoalsPage() {
  const result = await member.goals();
  const goals = result.ok ? result.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="My goals"
        description="What you're working towards."
        actions={
          <Button size="sm" disabled title="Adding goals is coming soon">
            <Plus className="size-4" /> Add goal
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals just yet"
          description="Set your first goal and we'll help you make steady, encouraging progress towards it."
          action={
            <Button size="sm" disabled title="Adding goals is coming soon">
              <Plus className="size-4" /> Add goal
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {goals.map((goal) => {
            const pct = Math.max(0, Math.min(100, goal.progress));
            return (
              <Panel key={goal.id} title={goal.title} actions={<StatusBadge status={goal.status} />}>
                <div className="flex flex-col gap-4">
                  {goal.description && (
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className="block h-full rounded-full bg-secondary"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
                      {pct}%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <Target className="size-4 text-primary" />
                      <span>
                        Current{' '}
                        <span className="font-medium">
                          {goal.currentValue ?? '—'}
                          {goal.unit ?? ''}
                        </span>{' '}
                        → Target{' '}
                        <span className="font-medium">
                          {goal.targetValue ?? '—'}
                          {goal.unit ?? ''}
                        </span>
                      </span>
                    </span>
                    {goal.targetDate && <span>By {goal.targetDate}</span>}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Prototype — sample data. AI replies are live but not clinically reviewed. No real health records, bookings or payments are connected.
      </p>
    </div>
  );
}
