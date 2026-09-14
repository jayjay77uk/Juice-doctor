import { notFound } from 'next/navigation';
import { createMetadata } from '@/config/metadata';
import { SpecialistChat } from '@/components/dashboard/specialist-chat';
import { ConversationToolbar } from '@/components/dashboard/conversation-toolbar';
import { conversations_service } from '@/services/conversations';
import { conversationAttachmentsRepo } from '@/services/repositories/conversation-attachments-repo';
import { agents } from '@/services/agents';
import { getSession } from '@/services/auth';
import { voiceStatus } from '@/services/voice';

export const metadata = createMetadata({ title: 'Conversation' });
export const dynamic = 'force-dynamic';

export default async function ConversationThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const convo = await conversations_service.byId(id);
  // Only the owner may view a thread (defence in depth alongside the actions).
  // No session means no owner match — never fail open when unauthenticated.
  if (!session?.user.id || !convo.ok || convo.data.userId !== session.user.id) notFound();

  const [messagesResult, rememberedResult, attachments] = await Promise.all([
    conversations_service.messages(id),
    conversations_service.remembered(session.user.id),
    conversationAttachmentsRepo.list(id, session.user.id),
  ]);

  let agentName = 'Specialist AI';
  let agentTitle: string | undefined;
  let agentSlug: string | undefined;
  if (convo.data.agentId) {
    const agentResult = await agents.byId(convo.data.agentId);
    if (agentResult.ok) {
      agentName = agentResult.data.name;
      agentTitle = agentResult.data.role;
      agentSlug = agentResult.data.slug;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-5"><p className="truncate text-sm text-muted-foreground">{convo.data.title}</p><ConversationToolbar conversationId={id} title={convo.data.title}/></div>
      <SpecialistChat
        key={id}
        attachments={attachments}
        conversationId={id}
        agentName={agentName}
        {...(agentTitle ? { agentTitle } : {})}
        {...(agentSlug ? { specialistSlug: agentSlug } : {})}
        initialMessages={messagesResult.ok ? messagesResult.data : []}
        remembered={rememberedResult.ok ? rememberedResult.data : []}
        voice={voiceStatus()}
      />
    </div>
  );
}
