-- 0018_knowledge_fts.sql
-- Full-text search over knowledge chunks (the retrieval layer for RAG). A stored
-- generated tsvector + GIN index gives real ranked retrieval today; when an
-- embeddings provider is added later, a vector column can sit alongside this
-- without changing the retrieval interface. Additive + idempotent.

alter table public.knowledge_chunks
  add column if not exists content_tsv tsvector
  generated always as (to_tsvector('english', coalesce(content, ''))) stored;

create index if not exists knowledge_chunks_tsv_idx
  on public.knowledge_chunks using gin (content_tsv);
