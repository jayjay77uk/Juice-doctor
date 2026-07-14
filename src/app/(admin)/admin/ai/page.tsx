import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, MessageSquareText, BookOpen, MessagesSquare, ArrowRight, FlaskConical, ShieldCheck, BarChart3 } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { agents } from '@/services/agents';
import { promptService } from '@/services/prompts';
import { knowledge } from '@/services/knowledge';
import { analytics } from '@/services/analytics';
import { AdminHeader } from '@/components/admin/admin-header';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';

export const metadata: Metadata = createMetadata({ title: 'AI Dashboard' });

const quickLinks = [
  { href: '/admin/ai/agents', label: 'Manage agents', icon: Bot, desc: 'Create, edit, version and publish AI agents.' },
  { href: '/admin/ai/prompts', label: 'Prompt library', icon: MessageSquareText, desc: 'Versioned prompts with a publishing workflow.' },
  { href: '/admin/ai/playground', label: 'Playground', icon: FlaskConical, desc: 'Test agents and prompts safely.' },
  { href: '/admin/ai/safety', label: 'Safety Centre', icon: ShieldCheck, desc: 'Configure guardrails and escalation.' },
  { href: '/admin/ai/analytics', label: 'Analytics', icon: BarChart3, desc: 'Usage, cost, satisfaction and more.' },
  { href: '/admin/knowledge', label: 'Knowledge base', icon: BookOpen, desc: 'Documents, collections and workflow.' },
];

export default async function AiDashboardPage() {
  const [agentsResult, promptsResult, kStats, summary] = await Promise.all([
    agents.list(),
    promptService.list(),
    knowledge.stats(),
    analytics.summary(),
  ]);
  const agentList = agentsResult.ok ? agentsResult.data : [];
  const prompts = promptsResult.ok ? promptsResult.data : [];
  const stats = kStats.ok ? kStats.data : null;
  const metrics = summary.ok ? summary.data : null;
  const activeAgents = agentList.filter((a) => a.status === 'active').length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="AI Dashboard"
        description="The control centre for every AI assistant. Everything here is configuration — build once, configure forever. Live inference runs only in the isolated Playground; production and customer traffic are not connected."
      />

      <StatGrid>
        <StatCard label="AI agents" value={agentList.length} icon={Bot} hint={`${activeAgents} active`} />
        <StatCard label="Managed prompts" value={prompts.length} icon={MessageSquareText} />
        <StatCard label="Knowledge documents" value={stats?.total ?? 0} icon={BookOpen} hint={`${stats?.published ?? 0} published`} />
        <StatCard label="Conversations (30d)" value={metrics ? metrics.totalConversations.toLocaleString() : '—'} icon={MessagesSquare} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Agents" description="Every configured assistant" actions={<Link href="/admin/ai/agents" className="text-sm font-medium text-primary hover:underline">View all</Link>} padded={false}>
          <ul className="divide-y divide-border">
            {agentList.slice(0, 5).map((agent) => (
              <li key={agent.id} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <Link href={`/admin/ai/agents/${agent.id}`} className="truncate font-medium text-foreground hover:text-primary">
                    {agent.name}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">{agent.role}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={agent.visibility} />
                  <StatusBadge status={agent.status} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Jump to" padded={false}>
          <ul className="divide-y divide-border">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="group flex items-center gap-3 px-6 py-3.5 hover:bg-surface-muted/50">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
                    <link.icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{link.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{link.desc}</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <p className="rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        Prototype — all figures and data are mock, served through the Phase-3 service framework. No
        production AI, patient data, or payments are connected.
      </p>
    </div>
  );
}
