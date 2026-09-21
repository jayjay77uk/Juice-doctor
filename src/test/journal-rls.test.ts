import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

describe('journal and journey database ownership', () => {
  it('enforces owner-only reads/writes and rejects reassignment', async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create role anon; create role authenticated; create role service_role;
        create schema auth;
        create table auth.users (id uuid primary key);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        grant usage on schema auth to authenticated;
        grant execute on function auth.uid() to authenticated;
        insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
      `);
      await db.exec(readFileSync(new URL('../../db/migrations/20260915215959_member_journal_and_journey.sql', import.meta.url), 'utf8'));
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);`);
      await db.exec(`insert into public.member_journal(user_id,entry_date,title,body) values (auth.uid(),'2026-09-15','Today','Private'); insert into public.member_journeys values(auth.uid(),'sleep',now());`);
      expect((await db.query('select * from member_journal')).rows).toHaveLength(1);
      await expect(db.exec(`update member_journal set user_id='00000000-0000-0000-0000-000000000002'`)).rejects.toThrow();
      await db.exec(`select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);`);
      expect((await db.query('select * from member_journal')).rows).toHaveLength(0);
      expect((await db.query('select * from member_journeys')).rows).toHaveLength(0);
      expect((await db.query("update member_journal set body='tampered' returning id")).rows).toHaveLength(0);
      await expect(db.exec(`insert into member_journeys(user_id,focus) values('00000000-0000-0000-0000-000000000001','fitness')`)).rejects.toThrow();
      await db.exec('reset role; set role anon;');
      await expect(db.query('select * from member_journal')).rejects.toThrow();
    } finally { await db.close(); }
  }, 30000);
});
