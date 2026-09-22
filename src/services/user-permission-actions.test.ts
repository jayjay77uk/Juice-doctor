import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({actor:{id:'owner',role:'super_administrator',organisationId:'org',denies:[] as string[]},from:vi.fn(),write:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/auth/authorize',()=>({assertPermission:async()=>({user:mocks.actor}),assertSession:vi.fn()}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({from:mocks.from})}));
vi.mock('./repositories/audit-repo',()=>({auditRepo:{log:vi.fn()}}));
import {updatePermissionOverride} from './user-admin-actions';
const target='00000000-0000-0000-0000-000000000001';
function form(){const f=new FormData();Object.entries({id:target,permission:'users.read',effect:'grant',reason:'Approved support duties',expires:''}).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();mocks.actor={id:'owner',role:'super_administrator',organisationId:'org',denies:[]};mocks.from.mockImplementation(()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{role:'member'},error:null}),upsert:mocks.write};return q;});mocks.write.mockResolvedValue({error:null});});
describe('permission override action boundaries',()=>{
  it('rejects administrator actors before accessing storage',async()=>{mocks.actor.role='administrator';expect((await updatePermissionOverride({ok:false},form())).ok).toBe(false);expect(mocks.from).not.toHaveBeenCalled();});
  it('does not allow delegation of a denied permission',async()=>{mocks.actor.denies=['users.read'];expect((await updatePermissionOverride({ok:false},form())).ok).toBe(false);expect(mocks.write).not.toHaveBeenCalled();});
  it('protects self edits',async()=>{mocks.actor.id=target;expect((await updatePermissionOverride({ok:false},form())).ok).toBe(false);expect(mocks.write).not.toHaveBeenCalled();});
  it('rejects expired overrides without writing',async()=>{const f=form();f.set('expires','2000-01-01T12:00');expect((await updatePermissionOverride({ok:false},f)).ok).toBe(false);expect(mocks.write).not.toHaveBeenCalled();});
  it('records valid owner changes against the validated target',async()=>{expect((await updatePermissionOverride({ok:false},form())).ok).toBe(true);expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({user_id:target,granted_by:'owner',permission_key:'users.read'}),expect.anything());});
});
