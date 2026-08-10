import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Watch, ShieldCheck, Activity, Check } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { connectionStats } from '@/services/herne/wearable/connections';
import { isWearableProviderConfigured } from '@/services/herne/wearable/provider';
import {
  listWearableCatalog, listConsents, listAiAccessLogs,
  type AdminWearableMetric, type AdminConsent, type AdminAiAccessLog,
} from '@/services/herne/admin';
import { HERNE_ORDER } from '@/data/herne/specialist-profiles';

export const metadata: Metadata = createMetadata({ title: 'HERNE wearable data' });
export const dynamic = 'force-dynamic';

export default async function HerneWearablePage() {
  const [catalog, consents, aiLogs, connStats, providerConfigured] = await Promise.all([
    listWearableCatalog(),
    listConsents(25),
    listAiAccessLogs(25),
    connectionStats(),
    Promise.resolve(isWearableProviderConfigured()),
  ]);
  const connectionSummary = Object.entries(connStats.byStatus)
    .map(([status, count]) => `${status}: ${count}`)
    .join(' · ');

  const catalogColumns: Column<AdminWearableMetric>[] = [
    { header: 'Metric', cell: (m) => <span className="font-medium text-foreground">{m.name}</span> },
    { header: 'Category', cell: (m) => <span className="capitalize text-muted-foreground">{m.category ?? '—'}</span> },
    { header: 'Unit', cell: (m) => <span className="text-muted-foreground">{m.unit ?? '—'}</span> },
    { header: 'Sensitivity', cell: (m) => <Badge tone={m.sensitivity === 'sensitive' ? 'accent' : 'neutral'}>{m.sensitivity}</Badge> },
    { header: 'Trend', cell: (m) => (m.trendSuitable ? <Badge tone="secondary">Yes</Badge> : <Badge tone="outline">No</Badge>) },
    { header: 'Specialists', align: 'right', cell: (m) => <span className="tabular-nums">{m.specialistAccess.length}</span> },
  ];

  const consentColumns: Column<AdminConsent>[] = [
    { header: 'Person', cell: (c) => <span className="font-mono text-xs text-muted-foreground">{c.userId.slice(0, 8)}…</span> },
    { header: 'Provider', cell: (c) => <span className="capitalize">{c.providerKey}</span> },
    { header: 'Categories', cell: (c) => <span className="text-muted-foreground">{c.categories.join(', ') || '—'}</span> },
    { header: 'Status', cell: (c) => <Badge tone={c.status === 'granted' ? 'secondary' : 'outline'}>{c.status}</Badge> },
    { header: 'v', align: 'right', cell: (c) => <span className="tabular-nums text-muted-foreground">{c.version}</span> },
  ];

  const logColumns: Column<AdminAiAccessLog>[] = [
    { header: 'Specialist', cell: (l) => <span className="font-medium capitalize text-foreground">{l.specialist}</span> },
    { header: 'Metrics used', cell: (l) => <span className="tabular-nums">{l.metricCount}</span> },
    { header: 'When', align: 'right', cell: (l) => <span className="text-muted-foreground tabular-nums">{new Date(l.createdAt).toLocaleString('en-GB')}</span> },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <Link href="/admin/herne" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> HERNE Intelligence
        </Link>
        <AdminHeader
          title="Wearable data"
          description="The client metric catalogue, per-specialist access permissions, consents and the AI access log."
        />
      </div>

      <Panel title="Provider connection" description="Live state of the device-provider integration and member connections.">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Provider (Thryve)</dt>
            <dd className="font-medium text-foreground">{providerConfigured ? 'Configured' : 'Not configured — requires THRYVE_API_KEY, THRYVE_APP_ID, THRYVE_WEBHOOK_SECRET'}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Member connections</dt>
            <dd className="font-medium text-foreground">{connectionSummary || 'None'}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Sync jobs (30d)</dt>
            <dd className="font-medium tabular-nums text-foreground">{connStats.syncJobs30d}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Last sync</dt>
            <dd className="font-medium text-foreground">{connStats.lastSyncAt ? new Date(connStats.lastSyncAt).toLocaleString('en-GB') : 'Never'}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          The ingest engine (consent-checked, validated, duplicate-safe), webhook endpoint, consent ledger and
          disconnect-with-deletion are ready; measurements flow only once the provider is credentialed. Nothing is
          simulated.
        </p>
      </Panel>

      <Panel title={`Metric catalogue — ${catalog.length}`} description="Client-supplied metrics, permitted use and limitations" padded={false}>
        <DataTable
          columns={catalogColumns}
          rows={catalog}
          getKey={(m) => m.metricId}
          empty={<EmptyState icon={Watch} title="Catalogue not ingested" description="Ingest the client wearable catalogue via the HERNE ingestion route." />}
        />
      </Panel>

      {/* Permission matrix — metric × specialist */}
      <Panel title="Specialist access matrix" description="Which specialist may interpret which metric (from the catalogue)" padded={false}>
        {catalog.length === 0 ? (
          <div className="p-8"><EmptyState icon={ShieldCheck} title="No catalogue yet" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-5 py-3 font-medium sm:px-6">Metric</th>
                  {HERNE_ORDER.map((s) => (
                    <th key={s} className="px-2 py-3 text-center font-medium capitalize" title={s}>{s.slice(0, 3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.map((m) => (
                  <tr key={m.metricId} className="border-b border-border/60">
                    <td className="px-5 py-3 font-medium text-foreground sm:px-6">{m.name}</td>
                    {HERNE_ORDER.map((s) => {
                      const allowed = m.specialistAccess.includes(s);
                      return (
                        <td key={s} className="px-2 py-3 text-center">
                          {allowed ? (
                            <Check className="mx-auto size-4 text-secondary" aria-label={`${s} allowed`} />
                          ) : (
                            <span className="text-muted-foreground/40" aria-label={`${s} not allowed`}>·</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Consents" description="Who has connected a wearable" padded={false}>
          <DataTable
            columns={consentColumns}
            rows={consents}
            getKey={(c) => c.id}
            empty={<EmptyState icon={ShieldCheck} title="No consents yet" description="Consents appear when a person connects a wearable." />}
          />
        </Panel>

        <Panel title="AI access log" description="Every time a specialist read wearable context" padded={false}>
          <DataTable
            columns={logColumns}
            rows={aiLogs}
            getKey={(l) => l.id}
            empty={<EmptyState icon={Activity} title="No AI access yet" description="Logged whenever a specialist builds wearable context (minimised, never raw)." />}
          />
        </Panel>
      </div>
    </div>
  );
}
