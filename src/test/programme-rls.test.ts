import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
describe('programme delivery database boundaries', () => {
  it('protects modules, prevents forged enrolments, and updates progress atomically', async () => {
    const db = new PGlite();
    const user = '00000000-0000-0000-0000-000000000001',
      other = '00000000-0000-0000-0000-000000000002';
    const programme = '00000000-0000-0000-0000-000000000003',
      moduleId = '00000000-0000-0000-0000-000000000004';
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
        create schema auth; create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
        create type public.enrollment_status as enum('active','completed','paused','cancelled');
        create table public.programmes(id uuid primary key,publish_status text);
        create table public.programme_enrollments(id uuid primary key default gen_random_uuid(),programme_id uuid references programmes(id),member_id uuid references auth.users(id),status enrollment_status default 'active',progress integer default 0,completed_at timestamptz);
        grant select on programmes,programme_enrollments to authenticated; grant all on programmes,programme_enrollments to service_role;
        grant insert,update,delete on programme_enrollments to authenticated;
        insert into auth.users values('${user}'),('${other}'); insert into programmes values('${programme}','draft');`);
      await db.exec(
        readFileSync(
          new URL('../../db/migrations/20260921073825_programme_delivery.sql', import.meta.url),
          'utf8',
        ),
      );
      await expect(db.exec(`update programmes set publish_status='published'`)).rejects.toThrow();
      await db.exec(`insert into programme_modules(id,programme_id,title,body,position) values('${moduleId}','${programme}','One','Reviewed content',1);
        update programmes set publish_status='published';
        insert into programme_enrollments(programme_id,member_id) values('${programme}','${user}');
        set role authenticated; select set_config('request.jwt.claim.sub','${other}',false);`);
      expect((await db.query('select * from programme_modules')).rows).toHaveLength(0);
      await expect(
        db.exec(
          `insert into programme_enrollments(programme_id,member_id) values('${programme}','${other}')`,
        ),
      ).rejects.toThrow();
      await expect(
        db.exec(`select set_programme_module_complete('${user}','${moduleId}',true)`),
      ).rejects.toThrow();
      await db.exec(`select set_config('request.jwt.claim.sub','${user}',false);`);
      expect((await db.query('select * from programme_modules')).rows).toHaveLength(1);
      await expect(
        db.exec(
          `insert into programme_module_progress(member_id,module_id) values('${user}','${moduleId}')`,
        ),
      ).rejects.toThrow();
      await db.exec(
        `reset role; set role service_role; select set_programme_module_complete('${user}','${moduleId}',true); select set_programme_module_complete('${user}','${moduleId}',true);`,
      );
      expect((await db.query('select progress,status from programme_enrollments')).rows[0]).toEqual(
        { progress: 100, status: 'completed' },
      );
      expect((await db.query('select * from programme_module_progress')).rows).toHaveLength(1);
      await expect(
        db.exec(`select set_programme_module_complete('${other}','${moduleId}',true)`),
      ).rejects.toThrow();
      await db.exec(`select set_programme_module_complete('${user}','${moduleId}',false);`);
      expect(
        (await db.query('select progress,status,completed_at from programme_enrollments')).rows[0],
      ).toEqual({ progress: 0, status: 'active', completed_at: null });
      await db.exec(`update programmes set publish_status='draft';`);
      await expect(db.exec(`update programme_modules set body='changed' where id='${moduleId}'`)).rejects.toThrow();
      await expect(
        db.exec(`select set_programme_module_complete('${user}','${moduleId}',true)`),
      ).rejects.toThrow();
      await db.exec(`reset role; set role authenticated;`);
      expect((await db.query('select * from programme_modules')).rows).toHaveLength(0);
      await db.exec('reset role; set role anon;');
      await expect(db.query('select * from programme_modules')).rejects.toThrow();
    } finally {
      await db.close();
    }
  }, 30000);
});
