import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { agents } from '@/services/agents';
import { playground } from '@/services/playground';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { PlaygroundConsole } from '@/components/admin/playground-console';
import { HERNE_ORDER } from '@/data/herne/specialist-profiles';

export const metadata: Metadata = createMetadata({ title: 'AI Playground' });
export const dynamic = 'force-dynamic';

export default async function PlaygroundPage() {
  const [agentsResult, logsResult] = await Promise.all([agents.list(), playground.logs(10)]);
  // Only the eight HERNE specialists are testable here, concierge (Makela) first.
  const order = HERNE_ORDER as readonly string[];
  const agentOptions = (agentsResult.ok ? agentsResult.data : [])
    .filter((a) => order.includes(a.slug))
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
    .map((a) => ({ id: a.id, name: a.name }));
  const logs = logsResult.ok ? logsResult.data : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="AI Playground"
        description="Safely test agents, prompts and knowledge retrieval. Runs are isolated — they never touch production agents, analytics, or data."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Playground' }]}
      />

      <PlaygroundConsole agents={agentOptions} />

      <Panel title="Recent test runs" description="Playground runs from this session" padded={false}>
        {logs.length > 0 ? (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                <p className="min-w-0 truncate text-sm text-foreground">{log.input}</p>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {log.latencyMs} ms · {(log.tokensInput ?? 0) + (log.tokensOutput ?? 0)} tokens
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-4 text-sm text-muted-foreground">No runs yet — try a test above.</p>
        )}
      </Panel>
    </div>
  );
}
