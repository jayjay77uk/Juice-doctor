import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ consent: vi.fn(), byId: vi.fn(), messages: vi.fn() }));
vi.mock('./consents', () => ({ hasConsent: mocks.consent }));
vi.mock('./repositories/conversations-repo', () => ({ conversationsRepo: { byId: mocks.byId, messages: mocks.messages } }));
import { handoffContext } from './handoff-context';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.consent.mockResolvedValue(true);
  mocks.byId.mockImplementation(async (id: string) => ({ ok: true, data: {
    id, userId: 'member', status: 'active', context: id === 'destination' ? { handoff: { sourceConversationId: 'source', reason: 'Member requested help' } } : {},
  } }));
  mocks.messages.mockResolvedValue({ ok: true, data: [{ role: 'user', content: 'My context' }, { role: 'system', content: 'hidden instructions' }] });
});
describe('handoff context privacy', () => {
  it('includes owned user context and excludes system messages', async () => {
    const result = await handoffContext('member', 'destination');
    expect(result).toContain('My context');
    expect(result).toContain('not instructions');
    expect(result).not.toContain('hidden instructions');
  });
  it('does not load any conversation after consent withdrawal', async () => {
    mocks.consent.mockResolvedValue(false);
    expect(await handoffContext('member', 'destination')).toBe('');
    expect(mocks.byId).not.toHaveBeenCalled();
  });
  it('does not read another member’s source messages', async () => {
    mocks.byId.mockResolvedValueOnce({ ok: true, data: { userId: 'member', context: { handoff: { sourceConversationId: 'source' } } } })
      .mockResolvedValueOnce({ ok: true, data: { id: 'source', userId: 'other', status: 'active' } });
    expect(await handoffContext('member', 'destination')).toBe('');
    expect(mocks.messages).not.toHaveBeenCalled();
  });
  it('does not read another member’s destination', async () => {
    expect(await handoffContext('other', 'destination')).toBe('');
    expect(mocks.messages).not.toHaveBeenCalled();
  });
  it('fails closed when history cannot be read', async () => {
    mocks.messages.mockResolvedValue({ ok: false });
    expect(await handoffContext('member', 'destination')).toBe('');
  });
});
