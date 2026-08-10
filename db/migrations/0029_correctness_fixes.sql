-- ============================================================================
-- 0029 — Correctness fixes (post-audit hardening batch, 2026-08-10).
--
--   1) herne_care_plan_actions.status: 0021 created the column with default
--      'pending', but 0025 replaced the status vocabulary with a 7-state set
--      whose check constraint EXCLUDES 'pending' — so any INSERT relying on
--      the column default violated herne_care_plan_actions_status_chk.
--      The default becomes 'proposed', the entry state of the 0025 machine.
--
--   2) search_knowledge_chunks(): ranked, state-aware knowledge retrieval.
--      Retrieval previously match-filtered chunks with no ts_rank ordering and
--      ignored document state, so archived or unpublished documents could
--      still ground live AI answers. This function is the single retrieval
--      path: ranked by ts_rank, scoped to the agent's assigned documents, and
--      restricted to published + available documents only.
--
-- Safe + idempotent: ALTER ... SET DEFAULT rewrites no rows; CREATE OR REPLACE
-- is repeatable. No destructive statements.
-- Depends on: 0012 (knowledge tables), 0018 (content_tsv), 0021, 0025.
-- ============================================================================

alter table public.herne_care_plan_actions alter column status set default 'proposed';

create or replace function public.search_knowledge_chunks(
  p_agent uuid,
  p_query text,
  p_k int default 4
)
returns table (document_id uuid, content text, chunk_index int, rank real)
language sql
stable
as $$
  select c.document_id,
         c.content,
         c.chunk_index,
         ts_rank(c.content_tsv, to_tsquery('english', p_query)) as rank
  from public.knowledge_chunks c
  join public.knowledge_documents d
    on d.id = c.document_id
   and d.publish_status = 'published'
   and d.index_state = 'available'
  join public.ai_agent_knowledge_sources s
    on s.document_id = c.document_id
   and s.agent_id = p_agent
   and s.mode = 'include'
  where c.content_tsv @@ to_tsquery('english', p_query)
  order by rank desc, c.chunk_index
  limit p_k
$$;

comment on function public.search_knowledge_chunks(uuid, text, int) is
  'Ranked FTS retrieval for a specialist brain: top-k chunks by ts_rank, scoped to the agent''s assigned documents, published + available only.';
