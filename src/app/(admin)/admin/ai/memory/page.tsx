import type { Metadata } from 'next';
import Link from 'next/link';
import { Brain } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = createMetadata({ title: 'Memory Centre' });

interface Scope {
  scope: string;
  label: string;
  key: string;
  access: string;
  desc: string;
}

// prototype mock — the six configurable memory scopes (no service query needed).
const SCOPES: Scope[] = [
  {
    scope: 'session',
    label: 'Session Memory',
    key: 'session_id + user_id',
    access: 'The signed-in user',
    desc: 'Ephemeral scratchpad for one browser session.',
  },
  {
    scope: 'user',
    label: 'User Memory',
    key: 'user_id',
    access: 'The user; staff may read',
    desc: 'Durable facts and preferences about a member.',
  },
  {
    scope: 'conversation',
    label: 'Conversation Memory',
    key: 'conversation_id',
    access: 'The conversation owner',
    desc: 'A running summary bound to one conversation thread.',
  },
  {
    scope: 'agent',
    label: 'Agent Memory',
    key: 'agent_id',
    access: 'Org admins write; staff read',
    desc: 'An agent’s own operating instructions and learned notes.',
  },
  {
    scope: 'organisation',
    label: 'Organisation Memory',
    key: 'organisation_id',
    access: 'Org staff read; admins write',
    desc: 'Tenant-wide shared knowledge.',
  },
  {
    scope: 'global',
    label: 'Global Knowledge',
    key: '(platform-wide)',
    access: 'Everyone reads; super-admin writes',
    desc: 'Platform-wide facts available to all.',
  },
];

export default async function MemoryCentrePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Memory Centre"
        description="Six cleanly separated memory scopes. Each is isolated by design so a session note never leaks and an org fact never crosses tenants."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Memory' }]}
      />

      <Panel
        title="How memory is wired"
        actions={
          <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-primary">
            <Brain className="size-4.5" />
          </span>
        }
      >
        <p className="text-sm text-muted-foreground">
          Each agent&apos;s Memory Configuration — which of the six scopes it may read — is set
          per-agent in Agent Management. The scopes below are isolated by their identifying keys, so
          data written into one scope is never visible from another.
        </p>
        <div className="mt-4">
          <Button asChild size="sm">
            <Link href="/admin/ai/agents">Configure per-agent memory</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Prototype — mock data, served through the service layer. No production AI or patient data.
        </p>
      </Panel>

      <div className="grid gap-6 sm:grid-cols-2">
        {SCOPES.map((s) => (
          <Panel
            key={s.scope}
            title={s.label}
            actions={<StatusBadge status="active" />}
          >
            <p className="text-sm text-muted-foreground">{s.desc}</p>
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="flex items-center gap-1.5 font-medium text-foreground">
                  <Brain className="size-3.5 text-primary" aria-hidden />
                  Identifying key
                </dt>
                <dd className="font-mono text-muted-foreground">{s.key}</dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="font-medium text-foreground">Access</dt>
                <dd className="text-muted-foreground">{s.access}</dd>
              </div>
            </dl>
          </Panel>
        ))}
      </div>
    </div>
  );
}
