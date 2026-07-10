import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { CreateAgentForm } from '@/components/admin/create-agent-form';

export const metadata: Metadata = createMetadata({ title: 'New agent' });

export default function NewAgentPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <AdminHeader
        title="New AI agent"
        description="Create a new assistant. You can configure everything about its behaviour afterwards — nothing is hardcoded."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Agents', href: '/admin/ai/agents' }, { label: 'New' }]}
      />
      <Panel title="Agent details">
        <CreateAgentForm />
      </Panel>
    </div>
  );
}
