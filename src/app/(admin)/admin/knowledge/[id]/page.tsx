import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Eye, FileText, FolderTree, Tag, User } from 'lucide-react';

import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { knowledge, PUBLISH_TRANSITIONS } from '@/services/knowledge';
import {
  advanceIndexAction,
  archiveDocAction,
  failIndexAction,
  setDocActiveAction,
  transitionDocumentAction,
} from '@/services/admin-actions';
import type { KnowledgeIndexState } from '@/types/knowledge';

export const metadata = createMetadata({ title: 'Knowledge document' });

/** Label for the "advance" button, based on the current index state. */
const ADVANCE_LABELS: Partial<Record<KnowledgeIndexState, string>> = {
  uploaded: 'Start processing',
  processing: 'Mark indexed',
  indexed: 'Mark available',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function KnowledgeDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const docResult = await knowledge.documents.byId(id);
  if (!docResult.ok) notFound();
  const doc = docResult.data;

  const versionsResult = await knowledge.documents.versions(doc.id);
  const versions = versionsResult.ok ? versionsResult.data : [];

  const nextStatuses = PUBLISH_TRANSITIONS[doc.publishStatus];
  const advanceLabel = ADVANCE_LABELS[doc.indexState];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title={doc.title}
        breadcrumbs={[
          { label: 'Knowledge', href: '/admin/knowledge' },
          { label: doc.title },
        ]}
        actions={<StatusBadge status={doc.publishStatus} />}
      />

      <Panel
        title="Workflow"
        description="Move this document through the publishing and approval workflow."
      >
        <p className="text-sm text-muted-foreground">
          Current status:{' '}
          <span className="font-medium text-foreground">
            {doc.publishStatus.replace('_', ' ')}
          </span>
          .{' '}
          {nextStatuses.length > 0
            ? 'Choose the next step below.'
            : 'No further transitions are available from this status.'}
        </p>
        {nextStatuses.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {nextStatuses.map((next) => (
              <form key={next} action={transitionDocumentAction}>
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="to" value={next} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                >
                  Move to {next.replace('_', ' ')}
                </button>
              </form>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Indexing"
        description="Retrieval-readiness of this document in its knowledge brain. Documents are indexed, never trained."
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={doc.indexState} />
          <span className="text-sm text-muted-foreground">
            Assigned AI:{' '}
            <span className="font-medium text-foreground">
              {doc.assignedSpecialistSlug ?? '—'}
            </span>
          </span>
          <span className="text-sm text-muted-foreground">
            Active in brain:{' '}
            <span className="font-medium text-foreground">{doc.active ? 'Yes' : 'No'}</span>
          </span>
        </div>

        {doc.indexState === 'failed' && doc.errorMessage ? (
          <p className="mt-4 rounded-lg bg-[#f6e3e0] px-4 py-2.5 text-sm text-danger">
            {doc.errorMessage}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          {advanceLabel &&
          doc.indexState !== 'available' &&
          doc.indexState !== 'failed' &&
          doc.indexState !== 'archived' ? (
            <form action={advanceIndexAction}>
              <input type="hidden" name="id" value={doc.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                {advanceLabel}
              </button>
            </form>
          ) : null}

          {doc.indexState !== 'archived' ? (
            <form action={failIndexAction}>
              <input type="hidden" name="id" value={doc.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                Mark failed
              </button>
            </form>
          ) : null}

          <form action={setDocActiveAction}>
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="active" value={String(!doc.active)} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              {doc.active ? 'Deactivate' : 'Activate'}
            </button>
          </form>

          <form action={archiveDocAction}>
            <input type="hidden" name="id" value={doc.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              Archive
            </button>
          </form>
        </div>
      </Panel>

      <Panel title="Details" description="Metadata for this knowledge document.">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileText className="size-4" aria-hidden />
              Source type
            </dt>
            <dd className="text-sm font-medium text-foreground">{doc.sourceType}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="size-4" aria-hidden />
              Visibility
            </dt>
            <dd className="text-sm font-medium text-foreground">{doc.visibility}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FolderTree className="size-4" aria-hidden />
              Category id
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {doc.categoryId ?? 'Uncategorised'}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="size-4" aria-hidden />
              Owner
            </dt>
            <dd className="text-sm font-medium text-foreground">{doc.ownerId}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Tag className="size-4" aria-hidden />
              Tags
            </dt>
            <dd className="flex flex-wrap gap-2">
              {doc.tags.length > 0 ? (
                doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No tags</span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden />
              Created
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {formatDate(doc.createdAt)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden />
              Updated
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {formatDate(doc.updatedAt)}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Preview" description="Rendered content preview.">
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Document preview renders here in production; source files are stored
            privately.
          </p>
        </div>
      </Panel>

      <Panel
        title="Version history"
        description="Every revision recorded for this document."
        padded={false}
      >
        {versions.length > 0 ? (
          <ul className="divide-y divide-border">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    Version {v.version} · {v.changeNote}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {v.title} — {v.createdBy}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(v.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-8 text-sm text-muted-foreground">
            No version history recorded yet.
          </p>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — mock data, served through the service layer. AI replies run on
        the live model (non-production); no real patient data.
      </p>
    </div>
  );
}
