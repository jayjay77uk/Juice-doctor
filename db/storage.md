# Storage layout

Storage is split by trust boundary. Marketing assets remain public-content concerns; knowledge and
conversation uploads use private buckets and short-lived signed URLs. Migration `0032` provisions
the two private buckets used by the application and must be applied to the Ask Juice Doctor Supabase
project before those upload paths can operate at runtime.

## Buckets

| Bucket | Visibility | Contents | Path convention |
| --- | --- | --- | --- |
| `media` | public | Marketing imagery (programmes, resources, hero, founder) | `media/<domain>/<slug>.<ext>` e.g. `media/programmes/programme-one.webp` |
| `testimonials` | public | Consented client portraits | `testimonials/<id>.webp` |
| `podcast` | public | Episode artwork; audio when self-hosted | `podcast/<slug>/cover.webp`, `podcast/<slug>/audio.mp3` |
| `documents` | private | Downloadable guides / lead magnets (signed URLs) | `documents/<slug>.pdf` |
| `avatars` | public | Profile / practitioner avatars | `avatars/<user_id>.webp` |
| `knowledge` | private | Approved knowledge source files (PDF/DOCX/TXT/CSV) backing `knowledge_documents.source_uri`; staff-only application ingestion | `knowledge/<document_id>/v<version>.<ext>` |
| `conversation-attachments` | private | Member conversation files; not automatically passed to AI | `<user_id>/<conversation_id>/<uuid>-<safe-name>` |

## Upload security

- Knowledge files are capped at **25 MB** and conversation attachments at **10 MB**.
- The server checks extension, declared MIME and binary magic bytes where a reliable signature exists;
  renamed binary files are rejected before storage.
- Browser code never receives a service-role key. Upload mutation runs in authenticated server actions
  after role/ownership checks.
- Knowledge originals and conversation attachments are private and never publicly listable.
- Conversation downloads are short-lived signed URLs issued only after the server verifies the signed-in
  user owns the parent conversation.
- Attachment metadata has RLS for conversation owners and organisation staff, but direct browser writes
  are intentionally not granted.
- Knowledge ingestion extracts/indexes approved text; scanned/image-only PDFs are rejected honestly until
  an OCR provider is selected. Conversation attachments are **not** silently ingested into HERNE context.
- A future malware-scanning provider can be inserted at the existing upload-validation seam before
  acceptance without changing the storage model.

## Other media

Public marketing buckets remain independently provisionable because the final client imagery and media
hosting choices are still pending. Images are served through `next/image` with explicit dimensions;
remote patterns are configured when a remote media host is finalised.
