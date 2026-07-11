'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startConversationAction } from '@/services/conversation-actions';

export function StartChatButton({ agentId, label = 'Start a conversation' }: { agentId: string; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await startConversationAction(agentId);
          if (res.ok) router.push(`/dashboard/conversations/${res.conversationId}`);
        })
      }
    >
      <MessageCircle className="size-4" /> {pending ? 'Opening…' : label}
    </Button>
  );
}
