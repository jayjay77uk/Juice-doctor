import { describe, it, expect } from 'vitest';
import { sanitizeIlikeTerm } from './sanitize';

describe('sanitizeIlikeTerm', () => {
  it('passes ordinary names and emails through', () => {
    expect(sanitizeIlikeTerm('Olivia Bennett')).toBe('Olivia Bennett');
    expect(sanitizeIlikeTerm('jane.doe+test@example.com')).toBe('jane.doe+test@example.com');
  });

  it('strips characters that could alter the PostgREST filter expression', () => {
    expect(sanitizeIlikeTerm('a,email.eq.x')).toBe('a email.eq.x');
    expect(sanitizeIlikeTerm('foo)or(name.eq.x')).not.toContain('(');
    expect(sanitizeIlikeTerm('foo)or(name.eq.x')).not.toContain(')');
    expect(sanitizeIlikeTerm('x*')).not.toContain('*');
    expect(sanitizeIlikeTerm('100%')).not.toContain('%');
  });

  it('escapes the LIKE single-character wildcard but keeps it searchable', () => {
    expect(sanitizeIlikeTerm('john_doe@x.com')).toBe('john\\_doe@x.com');
  });

  it('collapses whitespace and bounds length', () => {
    expect(sanitizeIlikeTerm('  a   b  ')).toBe('a b');
    expect(sanitizeIlikeTerm('x'.repeat(500)).length).toBeLessThanOrEqual(100);
  });

  it('returns an empty string for input that is only unsafe characters', () => {
    expect(sanitizeIlikeTerm('();,%*')).toBe('');
    expect(sanitizeIlikeTerm('русский поиск')).toBe('');
  });

  it('truncation never strands a dangling backslash from a split escape pair', () => {
    const out = sanitizeIlikeTerm('a'.repeat(99) + '_tail');
    expect(out.endsWith('\\')).toBe(false);
    // The underscore that survives the cut is still escaped as a pair.
    expect(out.includes('_') ? out.includes('\\_') : true).toBe(true);
  });
});
