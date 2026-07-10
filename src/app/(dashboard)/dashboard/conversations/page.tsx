import Link from 'next/link';
import { Bot, Clock, MessageCircle } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/sections/coming-soon';
import { member } from '@/services/member';

export const metadata = createMetadata({
  title: 'Your conversations',
  path: '/dashboard/conversations',
});

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default async function ConversationsPage() {
  const result = await member.savedConversations();
  const conversations = result.ok ? result.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Your conversations"
        description="Chats with your AI companion, saved for you."
      />

      {conversations.length === 0 ? (
        <Panel>
          <EmptyState
            icon={MessageCircle}
            title="No saved chats yet"
            description="When you talk with your AI companion, we'll keep your conversations here so you can pick up right where you left off."
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
                    {conversation.agent}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">{conversation.preview}</p>

                <p className="mt-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  Updated {formatUpdated(conversation.updatedAt)}
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

      <ComingSoon
        title="AI chat arrives soon"
        body="In the full platform you'll chat live with your AI companion here. This prototype shows the experience only."
      />

      <p className="text-sm text-muted-foreground">
        Prototype — sample data. No real health records, AI, or bookings are connected.
      </p>
    </div>
  );
}
