import { Bot } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { EmptyState } from '@/components/admin/empty-state';
import { StartChatButton } from '@/components/dashboard/start-chat-button';
import { member } from '@/services/member';

export const metadata = createMetadata({ title: 'My specialists' });

export default async function MySpecialistsPage() {
  const result = await member.mySpecialists();
  const specialists = result.ok ? result.data : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader title="My specialists" description="The specialist AIs you can open and chat with." />

      {specialists.length === 0 ? (
        <Panel title="No specialists yet">
          <EmptyState
            icon={Bot}
            title="No specialist access yet"
            description="Once you subscribe to a specialist AI, it appears here so you can start a conversation."
          />
        </Panel>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {specialists.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Bot className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.code || 'Specialist AI'}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{s.product?.tagline || s.description}</p>
              <div className="mt-auto pt-2">
                <StartChatButton agentId={s.id} label="Open chat" />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">Prototype — no live AI is connected.</p>
    </div>
  );
}
