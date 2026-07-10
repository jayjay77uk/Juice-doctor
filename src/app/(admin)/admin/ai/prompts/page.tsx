import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { promptService } from '@/services/prompts';
import { agents } from '@/services/agents';
import { PROMPT_KIND_LABELS, type Prompt } from '@/types/ai-platform';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';

export const metadata: Metadata = createMetadata({ title: 'Prompt Management' });

export default async function PromptsPage() {
  const [promptsResult, agentsResult] = await Promise.all([promptService.list(), agents.list()]);
  const rows = promptsResult.ok ? promptsResult.data : [];
  const agentNames = new Map((agentsResult.ok ? agentsResult.data : []).map((a) => [a.id, a.name]));

  const columns: Column<Prompt>[] = [
    {
      header: 'Prompt',
      cell: (p) => (
        <Link href={`/admin/ai/prompts/${p.id}`} className="flex items-center gap-2 font-medium text-foreground hover:text-primary">
          <MessageSquareText className="size-4 text-primary" />
          {p.name}
        </Link>
      ),
    },
    { header: 'Kind', cell: (p) => <span className="text-muted-foreground">{PROMPT_KIND_LABELS[p.kind]}</span> },
    { header: 'Agent', cell: (p) => <span className="text-muted-foreground">{p.agentId ? agentNames.get(p.agentId) ?? '—' : 'Global'}</span> },
    { header: 'Version', align: 'right', cell: (p) => <span className="tabular-nums text-muted-foreground">v{p.currentVersion}</span> },
    { header: 'Status', cell: (p) => <StatusBadge status={p.publishStatus} /> },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Prompt Management"
        description="Every prompt — system, developer, instruction, behaviour, restriction, safety, style and welcome — versioned with a publishing workflow. Nothing is hardcoded."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Prompts' }]}
      />
      <Panel padded={false}>
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(p) => p.id}
          empty={<EmptyState icon={MessageSquareText} title="No prompts yet" description="Prompts are created alongside agents." />}
        />
      </Panel>
    </div>
  );
}
