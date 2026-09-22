import type { Metadata } from 'next';
import { Settings2, Flag, Cpu } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { featureFlags } from '@/services/feature-flags';
import { systemSettings } from '@/services/system-settings';
import { toggleFeatureFlagAction } from '@/services/admin-actions';
import { env, isAiConfigured } from '@/lib/env';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import type { SystemSettingRow } from '@/services/system-settings';

export const metadata: Metadata = createMetadata({
  title: 'Configuration Centre',
  description: 'Feature flags, live AI runtime configuration and system settings.',
});

export const dynamic = 'force-dynamic';

const settingsColumns: Column<SystemSettingRow>[] = [
  {
    header: 'Key',
    cell: (s) => <span className="text-foreground font-mono text-sm">{s.key}</span>,
  },
  {
    header: 'Value',
    cell: (s) => (
      <span className="text-muted-foreground block max-w-md truncate text-sm">{s.preview}</span>
    ),
  },
  {
    header: 'Visibility',
    cell: (s) => <StatusBadge status={s.isPublic ? 'public' : 'private'} />,
  },
  {
    header: 'Updated',
    cell: (s) => <span className="text-muted-foreground text-sm">{s.updatedAt.slice(0, 10)}</span>,
  },
];

export default async function ConfigPage() {
  const flags = await featureFlags.all();
  const settingRows = await systemSettings.all();

  // The REAL runtime AI configuration — read from the same environment values
  // live inference uses (src/lib/env.ts).
  const aiRuntime: { label: string; value: string }[] = [
    {
      label: 'Provider',
      value: `${env.aiProvider}${isAiConfigured() ? '' : ' (no API key configured)'}`,
    },
    { label: 'Model', value: env.aiModel },
    { label: 'Max output tokens', value: String(env.aiMaxOutputTokens) },
    {
      label: 'Request timeout',
      value: `${Math.round(env.aiRequestTimeoutMs / 1000)}s per attempt`,
    },
    { label: 'Daily limit per user', value: `${env.aiDailyUserLimit} messages` },
    { label: 'Monthly limit per user', value: `${env.aiMonthlyUserLimit} messages` },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Configuration Centre"
        description="Feature flags, live AI runtime configuration and system settings."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Configuration' }]}
      />

      <Panel
        title="Feature flags"
        description="Live controls apply within 15 seconds. Capabilities without a connected implementation cannot be enabled."
        padded={false}
      >
        <ul className="divide-border divide-y">
          {flags.map((flag) => (
            <li key={flag.key} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-mono text-sm">{flag.key}</span>
                  <span className="bg-surface-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                    <Flag className="size-3" />
                    {flag.category}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{flag.description}</p>
              </div>
              <form action={toggleFeatureFlagAction} className="shrink-0">
                <input type="hidden" name="key" value={flag.key} />
                <button
                  type="submit"
                  disabled={!flag.operable}
                  className={
                    flag.enabled
                      ? 'text-secondary rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium'
                      : 'bg-surface-muted text-muted-foreground rounded-full px-3 py-1.5 text-xs font-medium'
                  }
                >
                  {!flag.operable ? 'Unavailable' : flag.enabled ? 'On' : 'Off'}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="AI runtime configuration"
        description="The live values inference runs with right now (environment-configured). Per-specialist behaviour comes from each agent's published prompt version."
        actions={<Cpu className="text-muted-foreground size-4" />}
      >
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {aiRuntime.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-sm">{item.label}</dt>
              <dd className="text-foreground font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel
        title="System settings"
        description="Live key/value settings from the platform database (system_settings)."
        actions={<Settings2 className="text-muted-foreground size-4" />}
        padded={false}
      >
        {settingRows.length ? (
          <DataTable columns={settingsColumns} rows={settingRows} getKey={(s) => s.key} />
        ) : (
          <p className="text-muted-foreground px-6 py-8 text-sm">No settings stored yet.</p>
        )}
      </Panel>

      <p className="text-muted-foreground text-sm">
        Every value on this page is live: flags and settings from the platform database, AI runtime
        values from the deployment environment.
      </p>
    </div>
  );
}
