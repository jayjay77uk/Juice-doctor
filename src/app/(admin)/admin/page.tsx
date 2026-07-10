import type { Metadata } from 'next';
import { Users, CalendarCheck, Inbox, FileText, Bot, Flag } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { admin } from '@/services/admin';
import { agents } from '@/services/agents';
import { featureFlags } from '@/services/feature-flags';

export const metadata: Metadata = createMetadata({ title: 'Admin', path: '/admin' });

const statusStyle: Record<string, string> = {
  Confirmed: 'bg-green-100 text-secondary',
  Requested: 'bg-amber-50 text-amber-700',
};

const bookings = [
  { name: 'Rachel Adeyemi', service: 'Body MOT', when: 'Mon 14 Jul · 9:00am', status: 'Confirmed' },
  { name: 'Tom Blake', service: 'Discovery Call', when: 'Mon 14 Jul · 2:30pm', status: 'Requested' },
  { name: 'Priya Shah', service: '21-Day Reset', when: 'Wed 16 Jul · 11:00am', status: 'Confirmed' },
  { name: 'Marcus Cole', service: 'Follow-up', when: 'Thu 17 Jul · 4:00pm', status: 'Requested' },
];

const agentStatusStyle: Record<string, string> = {
  active: 'bg-green-100 text-secondary',
  draft: 'bg-amber-50 text-amber-700',
  disabled: 'bg-surface-muted text-muted-foreground',
  archived: 'bg-surface-muted text-muted-foreground',
};

export default async function AdminPage() {
  // Read through the Phase-2 service framework (server-only; mock data here).
  const [metricsResult, agentsResult, flags] = await Promise.all([
    admin.metrics(),
    agents.list(),
    featureFlags.all(),
  ]);
  const metrics = metricsResult.ok
    ? metricsResult.data
    : { activeClients: 0, bookingsThisWeek: 0, unreadMessages: 0, publishedResources: 0 };
  const agentList = agentsResult.ok ? agentsResult.data : [];

  const stats = [
    { label: 'Active clients', value: metrics.activeClients, icon: Users },
    { label: 'Bookings this week', value: metrics.bookingsThisWeek, icon: CalendarCheck },
    { label: 'Unread messages', value: metrics.unreadMessages, icon: Inbox },
    { label: 'Published resources', value: metrics.publishedResources, icon: FileText },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">Practice overview</p>
        <h1 className="text-h2">Admin dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-5">
            <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-primary">
              <s.icon className="size-4.5" />
            </span>
            <p className="mt-4 font-serif text-3xl text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI agents — demonstrates the data-driven agent framework */}
        <div className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="inline-flex items-center gap-2 font-serif text-lg text-foreground">
              <Bot className="size-5 text-primary" /> AI agents
            </h2>
            <span className="text-sm text-muted-foreground">{agentList.length} configured</span>
          </div>
          <ul className="divide-y divide-border">
            {agentList.map((agent) => (
              <li key={agent.id} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{agent.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{agent.role}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {agent.visibility}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${agentStatusStyle[agent.status] ?? ''}`}>
                    {agent.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
            Agents are data — created and edited without code changes. No AI runs in this phase.
          </p>
        </div>

        {/* Feature flags — demonstrates the flag framework */}
        <div className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="inline-flex items-center gap-2 font-serif text-lg text-foreground">
              <Flag className="size-5 text-primary" /> Feature flags
            </h2>
            <span className="text-sm text-muted-foreground">{flags.length} flags</span>
          </div>
          <ul className="divide-y divide-border">
            {flags.map((flag) => (
              <li key={flag.key} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-foreground">{flag.key}</p>
                  <p className="truncate text-sm text-muted-foreground">{flag.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    flag.enabled ? 'bg-green-100 text-secondary' : 'bg-surface-muted text-muted-foreground'
                  }`}
                >
                  {flag.enabled ? 'On' : 'Off'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-serif text-lg text-foreground">Recent bookings</h2>
          <span className="text-sm text-muted-foreground">Sample data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Service</th>
                <th className="px-6 py-3 font-medium">When</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.name} className="border-b border-border last:border-0">
                  <td className="px-6 py-4 font-medium text-foreground">{b.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{b.service}</td>
                  <td className="px-6 py-4 text-muted-foreground">{b.when}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[b.status] ?? 'bg-surface-muted text-muted-foreground'}`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        Prototype — the admin dashboard reads through the Phase-2 service framework (agents, feature
        flags, metrics) with mock data. No records are stored or editable yet.
      </p>
    </div>
  );
}
