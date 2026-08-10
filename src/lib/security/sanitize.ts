/**
 * Input sanitisers for values interpolated into PostgREST filter expressions.
 * Pure module (no server deps) so it is unit-testable.
 */

/**
 * Make a user-supplied search term safe to embed in a PostgREST `.or()` ilike
 * pattern. Two attack surfaces exist: characters that alter the FILTER
 * EXPRESSION itself (`,` separates conditions, `(`/`)` group them, `*` is
 * PostgREST's like-wildcard alias) and characters that act as SQL LIKE
 * wildcards (`%`, `_`). Everything outside a conservative whitelist becomes a
 * space; `_` is kept (emails contain it) but escaped for LIKE.
 */
export function sanitizeIlikeTerm(raw: string): string {
  // Slice BEFORE escaping so truncation can never split a `\_` escape pair and
  // strand a dangling backslash (which would corrupt the appended % wildcard).
  return raw
    .replace(/[^a-zA-Z0-9@.+_' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .replace(/_/g, '\\_');
}
