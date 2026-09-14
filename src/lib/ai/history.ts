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

/** Retain complete recent turns within the remaining prompt budget. Never cuts a user
 * message in half or starts with an assistant. Persistent goals/memory live outside this window. */
export function fitHistory(history: ChatMessage[], query: string, system: string, maxTokens: number): ChatMessage[] {
  const budget = Math.max(0, maxTokens * 3 - system.length - query.length - 512);
  let used = 0;
  const kept: ChatMessage[] = [];
  for (const m of [...history].reverse()) {
    if (!m.content.trim()) continue;
    if (used + m.content.length > budget) break;
    kept.unshift(m); used += m.content.length;
  }
  while (kept.length && kept[0]!.role !== 'user') kept.shift();
  return [...kept, { role: 'user', content: query }];
}
