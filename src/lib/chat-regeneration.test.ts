import { describe, expect, it } from 'vitest';
import { regenerationInput } from './chat-regeneration';
import type { Message } from '@/types/conversation';
describe('regeneration context', () => {
  it('uses the last stored user turn and excludes its old answers', () => {
    const messages = [
      { role: 'user', content: 'earlier' }, { role: 'assistant', content: 'answer' },
      { role: 'user', content: 'latest' }, { role: 'assistant', content: 'old answer' },
    ] as Message[];
    expect(regenerationInput(messages)).toEqual({ content: 'latest', history: [{ role: 'user', content: 'earlier' }, { role: 'assistant', content: 'answer' }] });
    expect(messages).toHaveLength(4);
  });
  it('rejects a conversation without a user turn', () => expect(regenerationInput([])).toBeNull());
});
