import type { Metadata } from 'next';
import { Settings2, Flag, Cpu } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { featureFlags } from '@/services/feature-flags';
import { settings } from '@/services/platform';
import { toggleFeatureFlagAction } from '@/services/admin-actions';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import type { SystemSetting } from '@/types/platform';

export const metadata: Metadata = createMetadata({
  title: 'Configuration Centre',
  description: 'Feature flags, AI defaults and system settings — all editable, nothing hardcoded.',
});

// prototype mock — seeds ai_configurations in production.
const AI_DEFAULTS: { label: string; value: string }[] = [
  { label: 'Default model', value: 'Claude Opus 4.8' },
  { label: 'Max turns per conversation', value: '40' },
  { label: 'Rate limit', value: '20 requests/min' },
  { label: 'Default temperature', value: '0.7' },
];

const settingsColumns: Column<SystemSetting>[] = [
  {
    header: 'Key',
    cell: (s) => <span className="font-mono text-sm text-foreground">{s.key}</span>,
  },
  {
    header: 'Value',
    cell: (s) => <span className="text-sm text-muted-foreground">{String(s.value)}</span>,
  },
  {
    header: 'Visibility',
    cell: (s) => <StatusBadge status={s.isPublic ? 'public' : 'private'} />,
  },
  {
    header: 'Updated',
    cell: (s) => <span className="text-sm text-muted-foreground">{s.updatedAt.slice(0, 10)}</span>,
  },
];

export default async function ConfigPage() {
  const flags = await featureFlags.all();
  const settingsResult = await settings.all();
  const systemSettings = settingsResult.ok ? settingsResult.data : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Configuration Centre"
        description="Feature flags, AI defaults and system settings — all editable, nothing hardcoded."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Configuration' }]}
      />

      <Panel
        title="Feature flags"
        description="Toggle capabilities live — production layers organisation, role and user overrides on top."
        padded={false}
      >
        <ul className="divide-y divide-border">
          {flags.map((flag) => (
            <li key={flag.key} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground">{flag.key}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <Flag className="size-3" />
                    {flag.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
              </div>
              <form action={toggleFeatureFlagAction} className="shrink-0">
                <input type="hidden" name="key" value={flag.key} />
                <button
                  type="submit"
                  className={
                    flag.enabled
                      ? 'rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-secondary'
                      : 'rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-muted-foreground'
                  }
                >
                  {flag.enabled ? 'On' : 'Off'}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="AI configuration"
        description="Defaults applied to every agent unless overridden."
        actions={<Cpu className="size-4 text-muted-foreground" />}
      >
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {AI_DEFAULTS.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">{item.label}</dt>
              <dd className="font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-muted-foreground">
          Prototype — these seed <span className="font-mono">ai_configurations</span> in production.
        </p>
      </Panel>

      <Panel
        title="System settings"
        description="Platform key/value settings, resolved per organisation."
        actions={<Settings2 className="size-4 text-muted-foreground" />}
        padded={false}
      >
        <DataTable columns={settingsColumns} rows={systemSettings} getKey={(s) => s.id} />
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — mock data, served through the service layer. No production AI or patient data.
      </p>
    </div>
  );
}
