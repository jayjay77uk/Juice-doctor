import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, Plus, Pencil, Power, Rocket, Copy, Archive } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { agents } from '@/services/agents';
import type { AiAgent } from '@/types/ai';
import {
  publishAgentAction,
  duplicateAgentAction,
  archiveAgentAction,
  toggleAgentAction,
} from '@/services/admin-actions';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = createMetadata({ title: 'AI Agents' });

function IconAction({
  action,
  id,
  label,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title={label}
        aria-label={label}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        {children}
      </button>
    </form>
  );
}

export default async function AgentsPage() {
  const result = await agents.list();
  const rows = result.ok ? result.data : [];

  const columns: Column<AiAgent>[] = [
    {
      header: 'Agent',
      cell: (a) => (
        <div className="min-w-0">
          <Link href={`/admin/ai/agents/${a.id}`} className="font-medium text-foreground hover:text-primary">
            {a.name}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">{a.slug}</p>
        </div>
      ),
    },
    { header: 'Role', cell: (a) => <span className="text-muted-foreground">{a.role}</span> },
    { header: 'Visibility', cell: (a) => <StatusBadge status={a.visibility} /> },
    { header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
    { header: 'Version', align: 'right', cell: (a) => <span className="tabular-nums text-muted-foreground">v{a.version}</span> },
    {
      header: 'Actions',
      align: 'right',
      cell: (a) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/ai/agents/${a.id}`}
            title="Edit"
            aria-label="Edit"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </Link>
          <IconAction action={toggleAgentAction} id={a.id} label={a.status === 'active' ? 'Disable' : 'Enable'}>
            <Power className="size-4" />
          </IconAction>
          <IconAction action={publishAgentAction} id={a.id} label="Publish">
            <Rocket className="size-4" />
          </IconAction>
          <IconAction action={duplicateAgentAction} id={a.id} label="Duplicate">
            <Copy className="size-4" />
          </IconAction>
          <IconAction action={archiveAgentAction} id={a.id} label="Archive">
            <Archive className="size-4" />
          </IconAction>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="AI Agents"
        description="Create, configure, version and publish AI assistants. Agents are data — no code changes required."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Agents' }]}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/ai/agents/new">
              <Plus className="size-4" /> New agent
            </Link>
          </Button>
        }
      />

      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(a) => a.id}
          empty={
            <EmptyState
              icon={Bot}
              title="No agents yet"
              description="Create your first AI agent to get started."
              action={
                <Button asChild size="sm">
                  <Link href="/admin/ai/agents/new">
                    <Plus className="size-4" /> New agent
                  </Link>
                </Button>
              }
            />
          }
        />
      </Panel>

      <p className="text-sm text-muted-foreground">
        Every action here writes through the service layer to the{' '}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">ai_agents</code> table — changes persist in the platform database.
      </p>
    </div>
  );
}
