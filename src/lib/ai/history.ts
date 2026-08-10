import type { ChatMessage } from './provider';

/**
 * Window the conversation history for a model request. Pure module so the
 * invariant is unit-testable: the Anthropic API rejects a messages array whose
 * first entry is an assistant turn, and a naive `slice(-n)` over an
 * odd-length history produces exactly that (e.g. a thread that opens with the
 * specialist's welcome message).
 */
export function windowHistory(history: ChatMessage[], max = 8): ChatMessage[] {
  const win = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-max);
  while (win.length && win[0]!.role !== 'user') win.shift();
  return win;
}
