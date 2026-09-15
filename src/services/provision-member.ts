import 'server-only';
import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG = '00000000-0000-0000-0000-000000000001';

/** Only call with a user verified by Supabase, never client-supplied identity.
 * Existing roles/status are preserved; metadata is used only for display name. */
export async function provisionMember(user: User): Promise<boolean> {
  if (!user.email_confirmed_at) return false;
  const sb = createAdminClient();
  if (!sb) return false;
  const { data, error } = await sb.from('profiles').select('id, organisation_id').eq('id', user.id).maybeSingle();
  if (error) return false;
  const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.slice(0, 120) : null;
  if (!data) {
    const result = await sb.from('profiles').insert({ id: user.id, email: user.email, full_name: name, organisation_id: ORG, role: 'member', status: 'active' });
    return !result.error;
  }
  if (!data.organisation_id) {
    const result = await sb.from('profiles').update({ organisation_id: ORG }).eq('id', user.id).is('organisation_id', null);
    return !result.error;
  }
  return true;
}
