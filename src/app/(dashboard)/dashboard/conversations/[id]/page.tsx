import { notFound } from 'next/navigation';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { SpecialistChat } from '@/components/dashboard/specialist-chat';
import { ConversationToolbar } from '@/components/dashboard/conversation-toolbar';
import { conversations_service } from '@/services/conversations';
import { agents } from '@/services/agents';
import { getSession } from '@/services/auth';

export const metadata = createMetadata({ title: 'Conversation' });
export const dynamic = 'force-dynamic';

export default async function ConversationThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const convo = await conversations_service.byId(id);
  // Only the owner may view a thread (defence in depth alongside the actions).
  if (!convo.ok || (session && convo.data.userId !== session.user.id)) notFound();

  const [messagesResult, rememberedResult] = await Promise.all([
    conversations_service.messages(id),
    conversations_service.remembered(session?.user.id),
  ]);

  let agentName = 'Specialist AI';
  let agentTitle: string | undefined;
  if (convo.data.agentId) {
    const agentResult = await agents.byId(convo.data.agentId);
    if (agentResult.ok) {
      agentName = agentResult.data.name;
      agentTitle = agentResult.data.role;
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <AdminHeader
        title={convo.data.title}
        description={`With ${agentName}`}
        breadcrumbs={[{ label: 'Conversations', href: '/dashboard/conversations' }, { label: convo.data.title }]}
        actions={<ConversationToolbar conversationId={id} title={convo.data.title} />}
      />
      <SpecialistChat
        conversationId={id}
        agentName={agentName}
        {...(agentTitle ? { agentTitle } : {})}
        initialMessages={messagesResult.ok ? messagesResult.data : []}
        remembered={rememberedResult.ok ? rememberedResult.data : []}
      />
    </div>
  );
}
