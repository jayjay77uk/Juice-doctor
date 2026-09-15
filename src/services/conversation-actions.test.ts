import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(), byId: vi.fn(), agent: vi.fn(), access: vi.fn(), send: vi.fn(),
  limit: vi.fn(), acquire: vi.fn(), release: vi.fn(), consent: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/authorize', () => ({ assertSession: mocks.session }));
vi.mock('./conversations', () => ({ conversations_service: { byId: mocks.byId, send: mocks.send } }));
vi.mock('./agents', () => ({ agents: { byId: mocks.agent } }));
vi.mock('./subscriptions', () => ({ subscriptionsService: { memberAccess: mocks.access } }));
vi.mock('./ai-usage', () => ({ checkUsageLimit: mocks.limit, acquireSlot: mocks.acquire, releaseSlot: mocks.release }));
vi.mock('@/lib/monitoring/events', () => ({ track: vi.fn() }));
vi.mock('./herne/referrals', () => ({ escalationEngine: {} }));
vi.mock('./consents', () => ({ hasConsent: mocks.consent }));
import { sendMessageAction } from './conversation-actions';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.consent.mockResolvedValue(true);
  mocks.session.mockResolvedValue({ user: { id: 'member' } });
  mocks.byId.mockResolvedValue({ ok: true, data: { userId: 'member', agentId: 'agent', status: 'active' } });
  mocks.agent.mockResolvedValue({ ok: true, data: { status: 'active', kind: 'specialist', slug: 'luca' } });
  mocks.access.mockResolvedValue({ ok: true, data: ['luca'] });
  mocks.acquire.mockReturnValue(true);
  mocks.limit.mockResolvedValue({ allowed: true });
  mocks.send.mockResolvedValue({ ok: true, data: [] });
});
describe('alternate message action', () => {
  it('rejects withdrawn AI consent', async () => {
    mocks.consent.mockResolvedValue(false);
    expect((await sendMessageAction('thread', 'hello')).ok).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('denies another member’s conversation without sending', async () => {
    mocks.byId.mockResolvedValue({ ok: true, data: { userId: 'other' } });
    expect((await sendMessageAction('thread', 'hello')).ok).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('denies missing subscription access', async () => {
    mocks.access.mockResolvedValue({ ok: true, data: [] });
    expect((await sendMessageAction('thread', 'hello')).ok).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('denies disabled specialists', async () => {
    mocks.agent.mockResolvedValue({ ok: true, data: { status: 'disabled' } });
    expect((await sendMessageAction('thread', 'hello')).ok).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('enforces usage limits and releases the reservation', async () => {
    mocks.limit.mockResolvedValue({ allowed: false, message: 'Daily limit' });
    expect(await sendMessageAction('thread', 'hello')).toEqual({ ok: false, error: 'Daily limit' });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledWith('member');
  });
  it('releases reservations even when persistence throws', async () => {
    mocks.send.mockRejectedValue(new Error('offline'));
    await expect(sendMessageAction('thread', 'hello')).rejects.toThrow('offline');
    expect(mocks.release).toHaveBeenCalledWith('member');
  });
  it('allows a valid owned and entitled request', async () => {
    expect((await sendMessageAction('thread', ' hello ')).ok).toBe(true);
    expect(mocks.send).toHaveBeenCalledWith('thread', 'hello');
  });
});
