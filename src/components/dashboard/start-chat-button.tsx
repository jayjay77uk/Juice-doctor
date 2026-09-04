'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startConversationAction } from '@/services/conversation-actions';

/**
 * Start (or resume into) a conversation with one specialist. `agentId` accepts
 * an agent id OR a slug — startConversationAction resolves both and re-checks
 * entitlement server-side. Failures are surfaced, never swallowed.
 */
export function StartChatButton({
  agentId,
  label = 'Start a conversation',
  intent,
}: {
  agentId: string;
  label?: string;
  intent?: 'primary' | 'outline' | 'ghost';
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        {...(intent ? { intent } : {})}
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await startConversationAction(agentId);
            if (res.ok) router.push(`/dashboard/conversations/${res.conversationId}`);
            else setError(res.error);
          });
        }}
      >
        <MessageCircle className="size-4" /> {pending ? 'Opening…' : label}
      </Button>
      {error && (
        <span className="max-w-56 text-right text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
