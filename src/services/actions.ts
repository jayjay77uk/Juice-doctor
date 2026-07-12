'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  bookingSchema,
  contactSchema,
  newsletterSchema,
  registerSchema,
  signInSchema,
} from '@/lib/validation';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveLanding } from '@/lib/auth/landing';
import type { AppRole } from '@/lib/auth/roles';
import type { ActionResult } from './result';

/**
 * Write path — Server Actions. The MOCK implementation lives behind the
 * `'use server'` boundary, so switching to production (Resend email + Supabase
 * insert) is a body swap, not a component rewrite. Client forms call these via
 * `useActionState` and already get real pending/error/success wiring.
 *
 * Prototype guarantee: NOTHING is sent or stored. Every action validates and
 * returns a typed, friendly success.
 */

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const flat = error.flatten().fieldErrors;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value && value.length) out[key] = value;
  }
  return out;
}

/** Simulate the latency of a real network call so loading states are visible. */
async function simulateLatency(ms = 700): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitContact(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check the highlighted fields.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  await simulateLatency();
  // Prototype: no email is sent. Phase 2: Resend + Supabase insert here.
  return {
    status: 'success',
    message: `Thank you, ${parsed.data.name.split(' ')[0]} — we’ll be in touch soon. (Prototype: no message was actually sent.)`,
  };
}

export async function subscribeNewsletter(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = newsletterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please enter a valid email.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  await simulateLatency(500);
  return {
    status: 'success',
    message: 'You’re on the list. (Prototype: no subscription was created.)',
  };
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check your details.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const next = formData.get('next');
  if (!isSupabaseConfigured()) {
    await simulateLatency();
    return { status: 'success', message: 'Signed in. (Prototype: no real account — the dashboard is a demo.)' };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: 'error', message: 'Sign-in is currently unavailable. Please try again later.' };
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { status: 'error', message: 'Incorrect email or password.' };

  // Route to the area the user can actually enter (administrators → /admin),
  // honouring a safe ?next=. Read the role via the just-authenticated user client
  // (RLS self-read) so the landing decision does not depend on the service-role key
  // and always agrees with the /admin layout gate.
  let role: AppRole = 'member';
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  const resolved = profile?.role as AppRole | null | undefined;
  if (resolved) role = resolved;
  redirect(resolveLanding(role, next));
}

export async function register(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check the highlighted fields.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const next = formData.get('next');
  if (!isSupabaseConfigured()) {
    await simulateLatency();
    return { status: 'success', message: 'Account created. (Prototype: no real account is stored.)' };
  }
  const admin = createAdminClient();
  const supabase = await createSupabaseServerClient();
  if (!admin || !supabase) return { status: 'error', message: 'Registration is currently unavailable. Please try again later.' };

  const email = parsed.data.email;
  const password = parsed.data.password;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr || !created.user) {
    return { status: 'error', message: createErr?.message?.includes('already') ? 'An account with that email already exists.' : 'Could not create the account. Please try again.' };
  }
  // Sign the new user in to establish a session, then route them to their area.
  // New accounts are members, so this lands on /dashboard unless a safe next says otherwise.
  await supabase.auth.signInWithPassword({ email, password });
  redirect(resolveLanding('member', next));
}

/** Sign the current user out (clears the Supabase session) and return home. */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.signOut();
  }
  redirect('/');
}

export async function submitBooking(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please complete each step.',
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  await simulateLatency();
  return {
    status: 'success',
    message:
      'Your request is in. (Prototype: no appointment is actually reserved — we’ll confirm availability with you.)',
  };
}
