import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * HMAC signatures over receptionist reply text. The public console (visitors
 * are not signed in) needs text-to-speech for Makela's replies, but a public
 * arbitrary-text TTS endpoint would be a quota-abuse vector. So the server
 * SIGNS each reply it generates, and the public speak endpoint only voices
 * text carrying a valid signature — it can never be made to speak anything
 * the platform did not actually say. Keyed with server-only secret material;
 * the signature reveals nothing about the key.
 */

const CONTEXT = 'receptionist-reply-v1';

function key(): string {
  // Server-only secret material; present whenever the platform runs for real.
  return env.supabaseServiceRoleKey || env.anthropicApiKey || '';
}

export function signReply(text: string): string | null {
  const k = key();
  if (!k) return null;
  return createHmac('sha256', k).update(`${CONTEXT}:${text}`).digest('hex');
}

export function verifyReplySignature(text: string, signature: string): boolean {
  const expected = signReply(text);
  if (!expected || !signature) return false;
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
