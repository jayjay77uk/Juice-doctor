import type { Metadata } from 'next';
import { Brain, Users, MessageSquare } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';

export const metadata: Metadata = createMetadata({ title: 'Memory Centre' });
export const dynamic = 'force-dynamic';

/** Live counts over the real ai_memory table. */
async function memoryStats(): Promise<{ total: number; users: number; conversations: number }> {
  const sb = createAdminClient();
  if (!sb) return { total: 0, users: 0, conversations: 0 };
  const { data, count } = await sb
    .from('ai_memory')
    .select('user_id, conversation_id', { count: 'exact' })
    .limit(2000);
  const rows = data ?? [];
  return {
    total: count ?? rows.length,
    users: new Set(rows.map((r) => r.user_id).filter(Boolean)).size,
    conversations: new Set(rows.map((r) => r.conversation_id).filter(Boolean)).size,
  };
}

export default async function MemoryCentrePage() {
  const stats = await memoryStats();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Memory Centre"
        description="What the platform remembers for members — live counts from the memory store."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Memory' }]}
      />

      <StatGrid>
        <StatCard label="Stored memories" value={stats.total.toLocaleString('en-GB')} icon={Brain} />
        <StatCard label="Members with memory" value={stats.users.toLocaleString('en-GB')} icon={Users} />
        <StatCard label="Conversation memories" value={stats.conversations.toLocaleString('en-GB')} icon={MessageSquare} />
      </StatGrid>

      <Panel title="How memory works">
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            When a member states a durable preference in conversation (for example a dietary requirement), it is saved
            to the memory store and recalled into every future specialist reply — so the member never repeats
            themselves. Members control this from their own settings: they can view, delete individual memories, clear
            everything, or turn memory off entirely.
          </p>
          <p>
            Admin-side browsing and editing of individual memories is not built yet — member privacy controls live in
            each member&rsquo;s own Settings page.
          </p>
        </div>
      </Panel>
    </div>
  );
}
