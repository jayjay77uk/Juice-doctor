import { notFound } from 'next/navigation';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { SpecialistChat } from '@/components/dashboard/specialist-chat';
import { conversations_service } from '@/services/conversations';
import { agents } from '@/services/agents';

export const metadata = createMetadata({ title: 'Conversation' });

export default async function ConversationThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const convo = await conversations_service.byId(id);
  if (!convo.ok) notFound();

  const [messagesResult, rememberedResult] = await Promise.all([
    conversations_service.messages(id),
    conversations_service.remembered(),
  ]);

  let agentName = 'Specialist AI';
  if (convo.data.agentId) {
    const agentResult = await agents.byId(convo.data.agentId);
    if (agentResult.ok) agentName = agentResult.data.name;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <AdminHeader
        title={convo.data.title}
        description={`With ${agentName}`}
        breadcrumbs={[{ label: 'Conversations', href: '/dashboard/conversations' }, { label: convo.data.title }]}
      />
      <SpecialistChat
        conversationId={id}
        agentName={agentName}
        initialMessages={messagesResult.ok ? messagesResult.data : []}
        remembered={rememberedResult.ok ? rememberedResult.data : []}
      />
    </div>
  );
}
