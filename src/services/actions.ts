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
import { headers } from 'next/headers';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createInMemoryRateLimiter, enforceRateLimit, RATE_LIMIT_POLICIES } from '@/lib/security/rate-limit';
import { RateLimitError } from '@/lib/security/errors';
import type { ActionResult } from './result';

/** Post-auth landing resolver path (see src/app/continue/route.ts). */
function continuePath(next: FormDataEntryValue | null): string {
  return typeof next === 'string' && next ? `/continue?next=${encodeURIComponent(next)}` : '/continue';
}

/**
 * Write path — Server Actions. Auth (sign-in / register / sign-out) is real
 * Supabase Auth and rate-limited per visitor. The marketing forms (contact,
 * newsletter, public booking) have no provider connected yet, so they return
 * an honest "not available yet" error — nothing is ever simulated.
 */

const authLimiter = createInMemoryRateLimiter(RATE_LIMIT_POLICIES.auth);

/** Best-effort visitor key for rate limiting (per serverless instance). */
async function visitorKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

async function authRateLimited(scope: string): Promise<boolean> {
  try {
    await enforceRateLimit(authLimiter, `${scope}:${await visitorKey()}`);
    return false;
  } catch (e) {
    if (e instanceof RateLimitError) return true;
    throw e;
  }
}

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const flat = error.flatten().fieldErrors;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value && value.length) out[key] = value;
  }
  return out;
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
  // No email provider is connected yet — never pretend a message was sent.
  return {
    status: 'error',
    message: 'The contact form is not available yet — messaging is being connected. Please check back soon.',
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
  // No email provider is connected yet — never pretend a subscription exists.
  return {
    status: 'error',
    message: 'Newsletter sign-up is not available yet. Please check back soon.',
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
  if (await authRateLimited('signin')) {
    return { status: 'error', message: 'Too many sign-in attempts. Please wait a minute and try again.' };
  }
  const next = formData.get('next');
  if (!isSupabaseConfigured()) {
    return { status: 'error', message: 'Sign-in is currently unavailable. Please try again later.' };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: 'error', message: 'Sign-in is currently unavailable. Please try again later.' };
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { status: 'error', message: 'Incorrect email or password.' };

  // The session cookie is set on THIS response; resolve the role-based landing on
  // the next request via /continue (administrators → /admin, others → /dashboard),
  // honouring a safe ?next=.
  redirect(continuePath(next));
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
  if (await authRateLimited('register')) {
    return { status: 'error', message: 'Too many attempts. Please wait a minute and try again.' };
  }
  const next = formData.get('next');
  if (!isSupabaseConfigured()) {
    return { status: 'error', message: 'Registration is currently unavailable. Please try again later.' };
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
  // Sign the new user in to establish a session, then resolve their landing on
  // the next request via /continue (a fresh member lands on /dashboard).
  await supabase.auth.signInWithPassword({ email, password });
  redirect(continuePath(next));
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
  // Public booking is not connected yet — signed-in members book real
  // appointments from the dashboard; never pretend a slot was reserved here.
  return {
    status: 'error',
    message: 'Online booking from this page is not available yet. Members can book from their dashboard.',
  };
}
