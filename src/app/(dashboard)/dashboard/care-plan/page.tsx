import { Target, ClipboardList, Route, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { getSession } from '@/services/auth';
import { carePlan, timeline } from '@/services/herne/care-plan';
import { referralEngine } from '@/services/herne/referrals';
import { herneProfile } from '@/data/herne/specialist-profiles';
import { CarePlanActionList } from '@/components/dashboard/care-plan-action-list';
import { isTerminal, type ActionStatus } from '@/services/herne/care-plan-states';

export const metadata = createMetadata({ title: 'My care plan', path: '/dashboard/care-plan' });
export const dynamic = 'force-dynamic';

function specialistName(id: string): string {
  return herneProfile(id)?.name ?? id;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);
}

export default async function CarePlanPage() {
  const session = await getSession();
  const userId = session?.user.id;
  const plan = userId ? await carePlan.getOrCreate(userId) : null;
  const [actions, events, referrals] = plan && userId
    ? await Promise.all([carePlan.actions(plan.id), timeline.list(userId, 30), referralEngine.listForUser(userId)])
    : [[], [], []];

  const current = actions.filter((a) => !isTerminal(a.status as ActionStatus));
  const proposed = actions.filter((a) => a.status === 'proposed');
  const completed = actions.filter((a) => a.status === 'completed');
  const nextAction = current[0] ?? null;
  const actionViews = actions.map((a) => ({
    id: a.id,
    title: a.title,
    specialistName: specialistName(a.specialist),
    status: a.status as ActionStatus,
    evidenceRefs: a.evidenceRefs,
  }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader
        title="My care plan"
        description="One shared plan your whole HERNE team contributes to — so you never start over."
      />

      <StatGrid>
        <StatCard label="Current goals" value={plan?.goals.length ?? 0} icon={Target} />
        <StatCard label="Actions in progress" value={current.length} icon={ClipboardList} />
        <StatCard label="Specialists involved" value={plan?.assignedSpecialists.length ?? 0} icon={Users} />
        <StatCard label="Completed" value={completed.length} icon={CheckCircle2} />
      </StatGrid>

      {nextAction ? (
        <Panel title="Your next best action">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
              <ArrowRight className="size-4.5" />
            </span>
            <div>
              <p className="font-medium text-foreground">{nextAction.title}</p>
              <p className="text-sm text-muted-foreground">Suggested by {specialistName(nextAction.specialist)}</p>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Recommendations from your team"
          {...(proposed.length ? { description: `${proposed.length} proposed — accept or decline` } : {})}
          padded={false}
        >
          {actions.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState icon={ClipboardList} title="No recommendations yet" description="As you speak with your specialists, their proposed actions appear here for you to accept or decline." />
            </div>
          ) : (
            <CarePlanActionList actions={actionViews} />
          )}
        </Panel>

        <Panel title="Your journey">
          {events.length === 0 ? (
            <EmptyState icon={Route} title="Your timeline starts here" description="Registration, recommendations, referrals and reviews will appear here." />
          ) : (
            <ol className="flex flex-col gap-3">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-[10px] uppercase text-muted-foreground">
                    {e.type.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.createdAt)}
                      {e.specialist ? ` · ${specialistName(e.specialist)}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {referrals.length > 0 ? (
        <Panel title="Handoffs between your specialists">
          <ul className="flex flex-col gap-3">
            {referrals.slice(0, 8).map((r) => (
              <li key={String(r.id)} className="flex items-center gap-3 text-sm">
                <span className="font-medium text-foreground">{specialistName(String(r.from_specialist))}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{String(r.to_human_role ?? specialistName(String(r.to_specialist ?? '')))}</span>
                <span className="text-muted-foreground">— {String(r.reason ?? '')}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
