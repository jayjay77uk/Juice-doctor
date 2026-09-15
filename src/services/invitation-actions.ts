'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertRole } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/admin';
import { auditRepo } from './repositories/audit-repo';
import { sendTemplateMail } from './mail';

/**
 * User invitations (admin). Creates the real account, sets its role, and
 * generates a one-time password-setup link (Supabase recovery link — no
 * password ever passes through an admin's hands). The link is returned to the
 * admin to share directly and is shown ONCE; it is NEVER persisted (it would
 * be an account-takeover token at rest, and it expires). The queued invitation
 * email is generic — it tells the invitee to use "Forgot password" — so
 * nothing secret is stored in the outbox or delivered stale.
 */

const INVITABLE_ROLES = ['member', 'practitioner', 'staff', 'administrator'] as const;

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address.').max(254),
  role: z.enum(INVITABLE_ROLES),
  fullName: z.string().max(120).optional().or(z.literal('')),
});

export interface InviteResult {
  ok: boolean;
  error?: string;
  /** One-time password-setup link — displayed once, never stored by the app. */
  setupUrl?: string;
  emailQueued?: boolean;
}

export async function inviteUserAction(_prev: InviteResult, formData: FormData): Promise<InviteResult> {
  let actorId: string;
  let organisationId: string | null;
  try {
    const session = await assertRole('administrator');
    actorId = session.user.id;
    organisationId = session.user.organisationId;
  } catch {
    return { ok: false, error: 'Not authorised.' };
  }
  if (!organisationId) return { ok: false, error: 'Your organisation must be configured before inviting users.' };
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
    fullName: formData.get('fullName'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the fields.' };

  const sb = createAdminClient();
  if (!sb) return { ok: false, error: 'User management is not available right now.' };

  const email = parsed.data.email.toLowerCase();
  const { data: created, error: createError } = await sb.auth.admin.createUser({ email, email_confirm: true });
  if (createError || !created.user) {
    return { ok: false, error: createError?.message.includes('already') ? 'An account with that email already exists.' : 'Could not create the account.' };
  }

  // Role + name on the profile (created by the registration trigger).
  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .update({ role: parsed.data.role, organisation_id: organisationId, ...(parsed.data.fullName ? { full_name: parsed.data.fullName } : {}) })
    .eq('id', created.user.id).select('id').single();
  if (profileError || !profile) return { ok: false, error: 'The account was created but its profile could not be configured. Contact support before retrying.' };

  // One-time password-setup link (Supabase recovery link, generated — not emailed by Supabase).
  const { data: link, error: linkError } = await sb.auth.admin.generateLink({ type: 'recovery', email });
  const setupUrl = !linkError ? (link.properties?.action_link ?? '') : '';
  if (!setupUrl) return { ok: false, error: 'The account was created, but a setup link could not be generated. Use password recovery to finish setup.' };

  await auditRepo.log({
    actorId,
    action: 'user.invited',
    entityType: 'profiles',
    entityId: created.user.id,
    after: { role: parsed.data.role },
  });

  // The queued email is GENERIC — it never carries the recovery token (which
  // would sit in the outbox as an account-takeover credential and expire before
  // any deferred delivery). The one-time link is returned to the admin only.
  let emailQueued = false;
  try {
    const delivery = await sendTemplateMail({
      to: email,
      template: 'account.invitation',
      params: { role: parsed.data.role },
      dedupeKey: `invite:${created.user.id}`,
    });
    emailQueued = delivery.delivered || delivery.recorded;
  } catch {
    emailQueued = false;
  }

  revalidatePath('/admin/users');
  return {
    ok: true,
    ...(setupUrl ? { setupUrl } : {}),
    emailQueued,
  };
}
