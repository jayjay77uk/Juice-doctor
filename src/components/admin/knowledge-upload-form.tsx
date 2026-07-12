'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadDocumentAction } from '@/services/admin-actions';
import { idleAction } from '@/services/result';
import { Button } from '@/components/ui/button';
import { KNOWLEDGE_UPLOAD_KINDS } from '@/types/knowledge';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Uploading…' : 'Upload document'}
    </Button>
  );
}

export function KnowledgeUploadForm({
  specialists,
  categories,
}: {
  specialists: { slug: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(uploadDocumentAction, idleAction);
  const fe = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'error' && (
        <p
          className="inline-flex items-center gap-2 rounded-xl bg-[#f6e3e0] px-4 py-2.5 text-sm text-danger"
          role="alert"
        >
          <AlertCircle className="size-4" /> {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <p
          className="inline-flex items-center gap-2 rounded-xl bg-teal-100 px-4 py-2.5 text-sm text-primary"
          role="status"
        >
          <CheckCircle2 className="size-4" /> {state.message}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="title"
            name="title"
            className={inputClass}
            placeholder="e.g. Clinic aftercare guidelines"
          />
          {fe?.title?.[0] ? <span className="text-xs text-danger">{fe.title[0]}</span> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sourceType" className="text-sm font-medium text-foreground">
            Source type
          </label>
          <select id="sourceType" name="sourceType" className={inputClass} defaultValue="pdf">
            {KNOWLEDGE_UPLOAD_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
          {fe?.sourceType?.[0] ? <span className="text-xs text-danger">{fe.sourceType[0]}</span> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="assignedSpecialistSlug" className="text-sm font-medium text-foreground">
            Assigned AI
          </label>
          <select id="assignedSpecialistSlug" name="assignedSpecialistSlug" className={inputClass}>
            {specialists.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          {fe?.assignedSpecialistSlug?.[0] ? (
            <span className="text-xs text-danger">{fe.assignedSpecialistSlug[0]}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
            Category
          </label>
          <select id="categoryId" name="categoryId" className={inputClass} defaultValue="">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className={inputClass}
            placeholder="What does this document cover?"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="content" className="text-sm font-medium text-foreground">
            Content to index
          </label>
          <textarea
            id="content"
            name="content"
            rows={6}
            className={inputClass}
            placeholder="Paste the text the AI should learn from. It is chunked and indexed for retrieval so the assigned specialist can ground its answers in it."
          />
          <span className="text-xs text-muted-foreground">
            Paste text now to index it immediately. File parsing (PDF/DOCX) is added later.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Submit />
        <p className="text-xs text-muted-foreground">
          Text you paste is chunked and indexed for retrieval and assigned to the selected AI.
        </p>
      </div>
    </form>
  );
}
