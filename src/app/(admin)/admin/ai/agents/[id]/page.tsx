import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Rocket, Power, Copy, Archive, MessageSquareText } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { agents } from '@/services/agents';
import { promptService } from '@/services/prompts';
import { AVAILABLE_MODELS } from '@/config/ai-models';
import { PROMPT_KIND_LABELS } from '@/types/ai-platform';
import {
  publishAgentAction,
  duplicateAgentAction,
  archiveAgentAction,
  toggleAgentAction,
} from '@/services/admin-actions';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { AgentEditForm } from '@/components/admin/agent-edit-form';

export const metadata: Metadata = createMetadata({ title: 'Edit agent' });

function ActionButton({
  action,
  id,
  label,
  icon: Icon,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
      >
        <Icon className="size-4" /> {label}
      </button>
    </form>
  );
}

export default async function AgentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [agentResult, versionsResult, promptsResult] = await Promise.all([
    agents.byId(id),
    agents.versions(id),
    promptService.list({ agentId: id }),
  ]);
  if (!agentResult.ok) notFound();
  const agent = agentResult.data;
  const versions = versionsResult.ok ? versionsResult.data : [];
  const prompts = promptsResult.ok ? promptsResult.data : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader
        title={agent.name}
        description={agent.description || agent.role}
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Agents', href: '/admin/ai/agents' }, { label: agent.name }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={agent.status} />
            <ActionButton action={toggleAgentAction} id={agent.id} label={agent.status === 'active' ? 'Disable' : 'Enable'} icon={Power} />
            <ActionButton action={publishAgentAction} id={agent.id} label="Publish" icon={Rocket} />
            <ActionButton action={duplicateAgentAction} id={agent.id} label="Duplicate" icon={Copy} />
            <ActionButton action={archiveAgentAction} id={agent.id} label="Archive" icon={Archive} />
          </div>
        }
      />

      <AgentEditForm agent={agent} models={AVAILABLE_MODELS} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Managed prompts" description="Versioned prompts for this agent" padded={false}>
          {prompts.length > 0 ? (
            <ul className="divide-y divide-border">
              {prompts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                  <div className="min-w-0">
                    <Link href={`/admin/ai/prompts/${p.id}`} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary">
                      <MessageSquareText className="size-4 text-primary" />
                      {PROMPT_KIND_LABELS[p.kind]}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">v{p.currentVersion}</span>
                    <StatusBadge status={p.publishStatus} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">No managed prompts yet.</p>
          )}
        </Panel>

        <Panel title="Version history" description="Every published change is versioned" padded={false}>
          <ul className="divide-y divide-border">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                <div>
                  <p className="text-sm font-medium text-foreground">Version {v.version}</p>
                  <p className="text-xs text-muted-foreground">{v.changeNote}</p>
                </div>
                <span className="text-xs text-muted-foreground">{v.createdAt.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
