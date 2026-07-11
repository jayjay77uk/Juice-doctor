# Storage layout (paper / Phase-2 reference)

Designed now so media references in the content model (`ImageRef.src`, `PodcastEpisode.audioUrl`) map cleanly onto real buckets later. **Not provisioned in the prototype** — the app renders graded placeholders from `ImageRef.tone`.

## Buckets

| Bucket | Visibility | Contents | Path convention |
| --- | --- | --- | --- |
| `media` | public | Marketing imagery (programmes, resources, hero, founder) | `media/<domain>/<slug>.<ext>` e.g. `media/programmes/programme-one.webp` |
| `testimonials` | public | Consented client portraits | `testimonials/<id>.webp` |
| `podcast` | public | Episode artwork; audio when self-hosted | `podcast/<slug>/cover.webp`, `podcast/<slug>/audio.mp3` |
| `documents` | private | Downloadable guides / lead magnets (signed URLs) | `documents/<slug>.pdf` |
| `avatars` | public | Profile / practitioner avatars | `avatars/<user_id>.webp` |
| `knowledge` | private | Knowledge source files (PDF/DOCX/TXT/CSV/audio) backing `knowledge_documents.source_uri`; served to staff/agents via signed URLs only | `knowledge/<document_id>/v<version>.<ext>` |

## Rules

- **Public buckets** are read-only to anonymous users; writes require an admin session (mirrors the `is_admin()` RLS pattern in `rls.sql`).
- **Private buckets** are never publicly listable; access is via short-lived signed URLs issued server-side.
- Images are served through `next/image` with explicit dimensions; `remotePatterns` for the Supabase Storage host are added to `next.config.ts` when Phase 2 begins.
- The prototype stores **no** user uploads. The Remote Selfie Scan is entirely client-side and nothing is persisted.
