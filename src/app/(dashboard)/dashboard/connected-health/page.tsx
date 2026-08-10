import { Activity, HeartPulse, Moon, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { getSession } from '@/services/auth';
import { wearableDashboard } from '@/services/herne/wearable/store';
import { connectWearableAction, disconnectWearableAction } from '@/services/herne/wearable/actions';

export const metadata = createMetadata({ title: 'Connected health', path: '/dashboard/connected-health' });
export const dynamic = 'force-dynamic';

function DirectionIcon({ d }: { d: string }) {
  if (d === 'up') return <TrendingUp className="size-4 text-amber-500" />;
  if (d === 'down') return <TrendingDown className="size-4 text-secondary" />;
  return <Minus className="size-4 text-muted-foreground" />;
}

export default async function ConnectedHealthPage() {
  const session = await getSession();
  const userId = session?.user.id;
  const data = userId ? await wearableDashboard(userId) : { consent: false, categories: [], lastSyncAt: null, trends: [], qualityFlags: 0 };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader
        title="Connected health"
        description="Your wearable trends inform your HERNE team — with your consent, and only what each specialist is permitted to see."
        actions={
          data.consent ? (
            <form action={disconnectWearableAction}>
              <Button type="submit" intent="ghost" size="sm">Disconnect</Button>
            </form>
          ) : (
            <form action={connectWearableAction}>
              <Button type="submit" size="sm">Connect a device (sample data)</Button>
            </form>
          )
        }
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        The live device connection is not active yet. Connecting loads sample data so you can see how this works — no real device is synchronised.
      </div>

      <StatGrid>
        <StatCard label="Connection" value={data.consent ? 'Connected' : 'Not connected'} icon={ShieldCheck} />
        <StatCard label="Shared categories" value={data.consent ? data.categories.length : 0} icon={Activity} />
        <StatCard label="Trends tracked" value={data.trends.length} icon={HeartPulse} />
        <StatCard label="Data quality notices" value={data.qualityFlags} icon={AlertTriangle} />
      </StatGrid>

      <Panel title="Your trends" padded={false}>
        {data.trends.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={Moon}
              title={data.consent ? 'No trends yet' : 'Connect to see your trends'}
              description={data.consent ? 'Trends appear here once data has synced.' : 'Grant consent to bring your wearable trends into your care plan.'}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.trends.map((t) => (
              <li key={t.metricId} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <DirectionIcon d={t.direction} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  {t.missingNotice ? <p className="text-xs text-amber-600">{t.missingNotice}</p> : null}
                </div>
                <span className="text-sm tabular-nums text-foreground">
                  {t.average} {t.unit}
                </span>
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {t.deviation >= 0 ? '+' : ''}
                  {t.deviation} vs baseline
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-muted-foreground">
        Consumer wearable data is not diagnostic. Your specialists see trends (not raw readings), only the metrics their role permits, and only with your consent.
      </p>
    </div>
  );
}
