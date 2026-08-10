import { Activity, HeartPulse, Moon, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { getSession } from '@/services/auth';
import { wearableDashboard } from '@/services/herne/wearable/store';
import { getConnection } from '@/services/herne/wearable/connections';
import { isWearableProviderConfigured } from '@/services/herne/wearable/provider';
import { WearableConnectionControls } from '@/components/dashboard/wearable-connection-controls';

export const metadata = createMetadata({ title: 'Connected health', path: '/dashboard/connected-health' });
export const dynamic = 'force-dynamic';

function DirectionIcon({ d }: { d: string }) {
  if (d === 'up') return <TrendingUp className="size-4 text-amber-500" />;
  if (d === 'down') return <TrendingDown className="size-4 text-secondary" />;
  return <Minus className="size-4 text-muted-foreground" />;
}

const CONNECTION_LABELS: Record<string, string> = {
  active: 'Connected',
  pending: 'Authorisation pending',
  revoked: 'Disconnected',
};

export default async function ConnectedHealthPage() {
  const session = await getSession();
  const userId = session?.user.id;
  const [data, connection] = await Promise.all([
    userId ? wearableDashboard(userId) : Promise.resolve({ consent: false, categories: [], lastSyncAt: null, trends: [], qualityFlags: 0 }),
    userId ? getConnection(userId) : Promise.resolve(null),
  ]);
  const providerConfigured = isWearableProviderConfigured();
  const connectionLabel = connection ? (CONNECTION_LABELS[connection.status] ?? connection.status) : 'Not connected';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader
        title="Connected health"
        description="Your wearable trends inform your HERNE team — with your consent, and only what each specialist is permitted to see."
      />

      <Panel title="Device connection" description="Connect a wearable device, or disconnect at any time — disconnecting revokes consent and deletes your stored data.">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            Status: <span className="font-medium">{connectionLabel}</span>
            {connection?.lastSyncAt && (
              <span className="text-muted-foreground"> · last sync {new Date(connection.lastSyncAt).toLocaleString('en-GB')}</span>
            )}
          </p>
          <WearableConnectionControls status={connection?.status ?? null} providerConfigured={providerConfigured} />
        </div>
      </Panel>

      <StatGrid>
        <StatCard label="Connection" value={connectionLabel} icon={ShieldCheck} />
        <StatCard label="Shared categories" value={data.consent ? data.categories.length : 0} icon={Activity} />
        <StatCard label="Trends tracked" value={data.trends.length} icon={HeartPulse} />
        <StatCard label="Data quality notices" value={data.qualityFlags} icon={AlertTriangle} />
      </StatGrid>

      <Panel title="Your trends" padded={false}>
        {data.trends.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={Moon}
              title="No trends yet"
              description="Once the device provider is connected and your device has synced, your trends will appear here."
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
