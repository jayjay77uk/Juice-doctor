import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Check, Clock, FileText, Upload, Tag, Library } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { knowledge } from '@/services/knowledge';
import { AdminHeader } from '@/components/admin/admin-header';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { Panel } from '@/components/admin/panel';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { KnowledgeUploadForm } from '@/components/admin/knowledge-upload-form';
import { Button } from '@/components/ui/button';
import { specialists } from '@/services/specialists';
import type { KnowledgeDocument } from '@/types/knowledge';

export const metadata: Metadata = createMetadata({ title: 'Knowledge Base' });

export default async function KnowledgeBasePage() {
  const [statsResult, docsResult, categoriesResult, collectionsResult, specialistsResult] =
    await Promise.all([
      knowledge.stats(),
      knowledge.documents.list(),
      knowledge.categories.list(),
      knowledge.collections.list(),
      specialists.all(),
    ]);

  const stats = statsResult.ok ? statsResult.data : null;
  const documents = docsResult.ok ? docsResult.data.items : [];
  const categories = categoriesResult.ok ? categoriesResult.data : [];
  const collections = collectionsResult.ok ? collectionsResult.data : [];
  const specialistList = specialistsResult.ok ? specialistsResult.data : [];

  const categoryName = (id: string | null): string => {
    if (!id) return '—';
    const match = categories.find((c) => c.id === id);
    return match ? match.name : '—';
  };

  const specialistName = (slug: string | null): string => {
    if (!slug) return '—';
    const match = specialistList.find((s) => s.slug === slug);
    return match ? match.name : '—';
  };

  const columns: Column<KnowledgeDocument>[] = [
    {
      header: 'Title',
      cell: (d) => (
        <Link href={`/admin/knowledge/${d.id}`} className="font-semibold text-foreground hover:text-primary">
          {d.title}
        </Link>
      ),
    },
    { header: 'Type', cell: (d) => d.sourceType.toUpperCase() },
    { header: 'Assigned AI', cell: (d) => specialistName(d.assignedSpecialistSlug) },
    { header: 'Category', cell: (d) => categoryName(d.categoryId) },
    { header: 'Version', align: 'right', cell: (d) => `v${d.currentVersion}` },
    { header: 'Index state', cell: (d) => <StatusBadge status={d.indexState} /> },
    { header: 'Status', cell: (d) => <StatusBadge status={d.publishStatus} /> },
    { header: 'Uploaded', cell: (d) => d.createdAt.slice(0, 10) },
    { header: 'Updated', cell: (d) => d.updatedAt.slice(0, 10) },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Knowledge Base"
        description="Manage source documents, versions and the publishing workflow that powers grounded AI answers."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Knowledge Base' }]}
      />

      <StatGrid>
        <StatCard label="Total documents" value={stats?.total ?? 0} icon={BookOpen} />
        <StatCard label="Published" value={stats?.published ?? 0} icon={Check} />
        <StatCard label="In review" value={stats?.inReview ?? 0} icon={Clock} />
        <StatCard label="Drafts" value={stats?.drafts ?? 0} icon={FileText} />
      </StatGrid>

      <Panel
        title="Upload to a knowledge brain"
        description="Add a source document and assign it to a specialist AI. It enters the indexing pipeline as “uploaded”."
      >
        <KnowledgeUploadForm
          specialists={specialistList.map((s) => ({ slug: s.slug, name: s.name }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </Panel>

      <Panel title="Documents" padded={false}>
        <DataTable
          columns={columns}
          rows={documents}
          getKey={(d) => d.id}
          empty={<EmptyState icon={BookOpen} title="No documents" description="Uploaded source documents will appear here." />}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Categories" description="How knowledge is organised" padded={false}>
          {categories.length === 0 ? (
            <div className="px-6 py-4">
              <EmptyState icon={Tag} title="No categories" />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center gap-3 px-6 py-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
                    <Tag className="size-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Collections" description="Curated document sets" padded={false}>
          {collections.length === 0 ? (
            <div className="px-6 py-4">
              <EmptyState icon={Library} title="No collections" />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {collections.map((collection) => (
                <li key={collection.id} className="flex items-start gap-3 px-6 py-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
                    <Library className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{collection.name}</span>
                      <span className="text-xs text-muted-foreground">{collection.documentCount} docs</span>
                    </span>
                    {collection.description ? (
                      <span className="block truncate text-xs text-muted-foreground">{collection.description}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="text-sm text-muted-foreground">
        Prototype — mock data, served through the service layer. AI replies run on the live model (non-production); no real patient data.
      </p>
    </div>
  );
}
