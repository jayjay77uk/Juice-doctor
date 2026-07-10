/**
 * Backend domain-model barrel. Import entity types from '@/types'.
 * Note: the Phase-1 marketing content model (`@/types/content`) is intentionally
 * NOT re-exported here — it defines overlapping names (Consultation,
 * ProgrammeFormat) for the public site and is imported via its own path.
 */
export * from './identity';
export * from './health';
export * from './consultation';
export * from './commerce';
export * from './ai';
export * from './knowledge';
export * from './memory';
export * from './conversation';
export * from './platform';
