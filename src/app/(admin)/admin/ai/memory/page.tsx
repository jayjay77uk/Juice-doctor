import type { Metadata } from 'next';
import { Brain, Users, MessageSquare, Trash2 } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/authorize';
import { memoryRepo } from '@/services/repositories/memory-repo';
import { auditRepo } from '@/services/repositories/audit-repo';
import { adminDeleteMemoryAction } from '@/services/memory-admin-actions';
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
  const session = await requireRole('administrator', '/admin/ai/memory');
  const [stats, memories] = await Promise.all([memoryStats(), memoryRepo.adminList(100)]);
  await auditRepo.log({
    actorId: session.user.id,
    action: 'memory.admin_browse',
    entityType: 'ai_memory',
    after: { visibleRows: memories.length },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Memory Centre"
        description="Governance view of the live memory store. Member memory remains user-controlled; administrators can inspect recent rows for support/governance and remove an incorrect or inappropriate memory. Every browse and deletion is audit-logged."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Memory' }]}
      />

      <StatGrid>
        <StatCard label="Stored memories" value={stats.total.toLocaleString('en-GB')} icon={Brain} />
        <StatCard label="Members with memory" value={stats.users.toLocaleString('en-GB')} icon={Users} />
        <StatCard label="Conversation memories" value={stats.conversations.toLocaleString('en-GB')} icon={MessageSquare} />
      </StatGrid>

      <Panel title="Recent stored memories" description="Latest 100 rows. This page contains member context and is restricted to administrators.">
        {memories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No memories are stored.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">Member / scope</th>
                  <th className="px-3 py-3 font-medium">Kind</th>
                  <th className="px-3 py-3 font-medium">Memory</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  <th className="px-3 py-3 text-right font-medium">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {memories.map((memory) => (
                  <tr key={memory.id} className="align-top">
                    <td className="px-3 py-4">
                      <div className="font-medium text-foreground">{memory.memberName ?? memory.memberEmail ?? memory.userId ?? 'Platform memory'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{memory.scope}{memory.memberEmail && memory.memberName ? ` · ${memory.memberEmail}` : ''}</div>
                    </td>
                    <td className="px-3 py-4 text-foreground">
                      <div>{memory.kind}</div>
                      <div className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={memory.key}>{memory.key}</div>
                    </td>
                    <td className="max-w-xl px-3 py-4 text-foreground">
                      <p className="whitespace-pre-wrap break-words">{memory.content || '—'}</p>
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">{memory.source}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(memory.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-3 py-4 text-right">
                      <form action={adminDeleteMemoryAction}>
                        <input type="hidden" name="id" value={memory.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-muted"
                          title="Delete this stored memory"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Memory governance">
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Members retain the primary controls in their own Settings: view, delete individual memories, clear everything or disable memory. The administrator view exists for governance and correction, not silent profile building.
          </p>
          <p>
            Deleting a memory removes it from the live AI context immediately. Audit records keep only deletion metadata, not a second copy of the erased memory content.
          </p>
        </div>
      </Panel>
    </div>
  );
}
