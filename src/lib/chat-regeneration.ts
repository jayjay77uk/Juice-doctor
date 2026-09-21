import type { Message } from '@/types/conversation';
/** Regenerate from the last stored user turn, never a client-supplied replay. */
export function regenerationInput(messages: Message[]) {
  let index = messages.length - 1;
  while (index >= 0 && messages[index]?.role !== 'user') index--;
  if (index < 0) return null;
  return {
    content: messages[index]!.content,
    history: messages.slice(0, index).filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({ role: message.role as 'user' | 'assistant', content: message.content })),
  };
}
