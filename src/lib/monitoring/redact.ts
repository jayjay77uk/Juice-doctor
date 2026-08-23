/**
 * Monitoring redaction rules — the privacy boundary for everything that leaves
 * the platform for Sentry/PostHog. Health-data rule: NO conversation text, NO
 * health details, NO care-plan content, NO free text of any kind crosses this
 * boundary. Only short identifiers, slugs, counts, durations and status words
 * survive; user ids are one-way hashed before use as analytics identifiers.
 */

/** Longest string allowed through to a provider — slugs/statuses, never prose. */
const MAX_STRING = 64;

/** Property keys that must never leave, whatever their value. */
const FORBIDDEN_KEYS = new Set([
  'content', 'message', 'text', 'body', 'transcript', 'input', 'output',
  'email', 'name', 'phone', 'address', 'dob', 'password', 'token', 'secret',
  'assessment', 'summary', 'notes', 'reason', 'detail', 'health', 'diagnosis',
]);

export type SafeProps = Record<string, string | number | boolean>;

/** Drop forbidden keys, truncate strings, refuse nested structures. */
export function redactProps(props: Record<string, unknown>): SafeProps {
  const out: SafeProps = {};
  for (const [key, value] of Object.entries(props)) {
    const k = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(k)) continue;
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (typeof value === 'string') {
      // Strings longer than a slug are treated as prose and dropped entirely —
      // truncating prose would still leak content.
      if (value.length <= MAX_STRING) out[key] = value;
    }
    // objects/arrays/functions never pass
  }
  return out;
}

/**
 * One-way analytics identifier — never the raw user id, never reversible.
 * Uses the Web Crypto API so the same privacy boundary works in Node AND Edge
 * instrumentation; importing node:crypto here made Next's Edge bundle invalid.
 */
export async function analyticsId(userId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`ajd:${userId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

/** Error messages can embed user data — keep the class, bound the message. */
export function safeErrorSummary(error: unknown): { type: string; message: string } {
  if (error instanceof Error) {
    return { type: error.name || 'Error', message: error.message.slice(0, 200) };
  }
  return { type: 'UnknownError', message: String(error).slice(0, 200) };
}
