import Link from 'next/link';
import { Bot, Clock, MessageCircle } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { member } from '@/services/member';
import { agents } from '@/services/agents';

export const metadata = createMetadata({
  title: 'Your conversations',
  path: '/dashboard/conversations',
});

function formatUpdated(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default async function ConversationsPage() {
  const [convosResult, agentsResult] = await Promise.all([member.myConversations(), agents.list()]);
  const conversations = convosResult.ok ? convosResult.data : [];
  const agentList = agentsResult.ok ? agentsResult.data : [];
  const agentName = (id: string | null) => agentList.find((a) => a.id === id)?.name ?? 'Specialist AI';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Your conversations"
        description="Chats with your specialist AIs, saved so you can pick up where you left off."
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/specialists">Open a specialist</Link>
          </Button>
        }
      />

      {conversations.length === 0 ? (
        <Panel>
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Open one of your specialist AIs to start a conversation. Your chats are saved here."
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {conversations.map((conversation) => (
            <Panel key={conversation.id} className="flex flex-col">
              <div className="flex flex-1 flex-col gap-3">
                <div>
                  <h2 className="font-serif text-lg text-foreground">{conversation.title}</h2>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Bot className="size-4" />
                    {agentName(conversation.agentId)}
                  </p>
                </div>
                <p className="mt-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  Updated {formatUpdated(conversation.lastMessageAt)}
                </p>
              </div>
              <div className="mt-4">
                <Button asChild>
                  <Link href={`/dashboard/conversations/${conversation.id}`}>Continue</Link>
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Prototype — sample data. No live AI is connected.
      </p>
    </div>
  );
}
