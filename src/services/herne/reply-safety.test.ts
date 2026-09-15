import { describe, expect, it, vi } from 'vitest';
import type { AiAgent } from '@/types/ai';

vi.mock('@/lib/ai', () => ({ getAiProvider: () => null }));
vi.mock('../repositories/run-log-repo', () => ({ runLogRepo: { log: vi.fn() } }));
vi.mock('./referrals', () => ({
  escalationEngine: { escalate: vi.fn().mockResolvedValue({ escalationId: 'test' }) },
  referralRules: {}, referralEngine: {},
}));

import { herneSpecialistReply, streamHerneReply } from './reply';

const agent = {
  id: 'test-agent', slug: 'luca', name: 'Luca',
  safetyRules: { blockedTopics: ['chest pain'], escalateOn: ['chest pain'] },
} as AiAgent;

describe('local safety without a provider', () => {
  it('keeps urgent guidance ahead of configured topic boundaries', async () => {
    const reply = await herneSpecialistReply(agent, [], 'I have chest pain.');
    expect(reply.safety.category).toBe('emergency');
    expect(reply.safety.blocked).toBe(true);
    expect(reply.text).toContain('emergency services');
    expect(reply.available).toBe(true);
  });

  it('uses the same safety response on the streaming path', async () => {
    const chunks = [];
    for await (const chunk of streamHerneReply(agent, [], 'I have chest pain.')) chunks.push(chunk);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ type: 'final', reply: { safety: { blocked: true, category: 'emergency' } } });
  });

  it('reports ordinary chat unavailable without attempting inference', async () => {
    const reply = await herneSpecialistReply(agent, [], 'Hello');
    expect(reply.available).toBe(false);
    expect(reply.safety.blocked).toBe(false);
  });
});
