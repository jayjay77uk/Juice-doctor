import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exportAccount } from './account-export';

function client(failed = false) {
  const filters: unknown[][] = [];
  const from = vi.fn((table: string) => {
    let cursor: string | null = null;
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: (key: string, value: string) => { filters.push([table, key, value]); return query; },
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      gt: (_key: string, value: string) => { cursor = value; return query; },
      then: (resolve: (value: unknown) => unknown) => {
        const data = table === 'messages' && cursor === null
          ? [{ id: '1', content: 'own message', conversations: { user_id: 'member' } }]
          : table === 'messages' && cursor === '1' ? [{ id: '2', content: 'next page' }] : [];
        return Promise.resolve(resolve({ data, error: failed ? { message: 'failure' } : null }));
      },
    };
    return query;
  });
  return { sb: { from } as unknown as SupabaseClient, filters };
}

describe('account export', () => {
  it('uses real ownership columns and traverses messages through owned conversations', async () => {
    const { sb, filters } = client();
    const result = await exportAccount(sb, 'member');
    expect(filters).toContainEqual(['profiles', 'id', 'member']);
    expect(filters).toContainEqual(['messages', 'conversations.user_id', 'member']);
    expect(result.user_consents).toEqual([]);
    expect(result.messages).toEqual([{ id: '1', content: 'own message' }, { id: '2', content: 'next page' }]);
  });
  it('fails instead of disguising a query error as an empty export', async () => {
    await expect(exportAccount(client(true).sb, 'member')).rejects.toThrow('Account export unavailable');
  });
});
