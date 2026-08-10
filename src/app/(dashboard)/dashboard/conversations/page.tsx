import Link from 'next/link';
import { Bot, Clock, MessageCircle } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { member } from '@/services/member';
import { agents } from '@/services/agents';
import { getSession } from '@/services/auth';
import { NewConversationButton } from '@/components/dashboard/new-conversation-button';
import { HERNE_ORDER } from '@/data/herne/specialist-profiles';

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
  const session = await getSession();
  const [convosResult, agentsResult, accessibleResult] = await Promise.all([
    member.myConversations(session?.user.id),
    agents.list(),
    member.mySpecialists(),
  ]);
  const conversations = convosResult.ok ? convosResult.data : [];
  const agentList = agentsResult.ok ? agentsResult.data : [];
  const agentName = (id: string | null) => agentList.find((a) => a.id === id)?.name ?? 'Specialist AI';

  // Accessible HERNE specialists only (subscription + the Makela concierge),
  // concierge first — the picker must never offer a specialist the start
  // action would then reject.
  const accessible = new Set((accessibleResult.ok ? accessibleResult.data : []).map((a) => a.slug));
  const order = HERNE_ORDER as readonly string[];
  const specialists = agentList
    .filter((a) => order.includes(a.slug) && accessible.has(a.slug))
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
    .map((a) => ({ id: a.id, name: a.name, concierge: a.slug === 'makela' }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Your conversations"
        description="Chats with your specialist AIs, saved so you can pick up where you left off."
        actions={
          specialists.length > 0 ? (
            <NewConversationButton specialists={specialists} />
          ) : (
            <Button asChild size="sm">
              <Link href="/dashboard/specialists">Open a specialist</Link>
            </Button>
          )
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
        Replies are AI-generated and not clinically reviewed. Not for emergencies — call your local emergency services.
      </p>
    </div>
  );
}
