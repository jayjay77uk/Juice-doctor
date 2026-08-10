-- ============================================================================
-- 0030 — Lock down search_knowledge_chunks() execution (2026-08-10).
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, which on
-- Supabase means the anon and authenticated roles could call the retrieval
-- function directly via PostgREST (/rest/v1/rpc/search_knowledge_chunks) with
-- arbitrary queries — leaking knowledge content outside the app's service-role
-- retrieval path. Only the service role may execute it.
--
-- Safe + idempotent: REVOKE/GRANT are repeatable; no data statements.
-- Depends on: 0029 (the function).
-- ============================================================================

revoke execute on function public.search_knowledge_chunks(uuid, text, int) from public;
revoke execute on function public.search_knowledge_chunks(uuid, text, int) from anon;
revoke execute on function public.search_knowledge_chunks(uuid, text, int) from authenticated;
grant execute on function public.search_knowledge_chunks(uuid, text, int) to service_role;
