-- 0033_attachment_extracted_text.sql
--
-- Let a member's uploaded conversation file actually inform their specialist.
-- Text is extracted ONCE at upload (PDF/DOCX/TXT/CSV) and stored here, so each
-- turn injects it without re-downloading and re-parsing the file.
--
-- extraction_state records the honest outcome so the UI can tell the member
-- whether their file is readable by the specialist:
--   pending     - not yet processed
--   extracted   - text is available and will inform replies
--   unsupported - e.g. an image; needs OCR/vision, deliberately not faked
--   failed      - extraction attempted and failed (scanned PDF, corrupt file)
--
-- Additive + idempotent + forward-only. Table stays service-role only (RLS on,
-- read policies unchanged from 0032).
alter table public.conversation_attachments
  add column if not exists extracted_text text,
  add column if not exists extraction_state text not null default 'pending',
  add column if not exists extraction_error text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversation_attachments_extraction_state_check'
  ) then
    alter table public.conversation_attachments
      add constraint conversation_attachments_extraction_state_check
      check (extraction_state in ('pending', 'extracted', 'unsupported', 'failed'));
  end if;
end $$;

comment on column public.conversation_attachments.extracted_text is
  'Server-extracted plain text, injected into the specialist prompt as untrusted reference material (never executed as instructions).';
