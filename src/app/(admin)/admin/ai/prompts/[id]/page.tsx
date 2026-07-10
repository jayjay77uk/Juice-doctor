import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createMetadata } from '@/config/metadata';
import { promptService } from '@/services/prompts';
import { PROMPT_KIND_LABELS } from '@/types/ai-platform';
import { AdminHeader } from '@/components/admin/admin-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { PromptEditor } from '@/components/admin/prompt-editor';

export const metadata: Metadata = createMetadata({ title: 'Edit prompt' });

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [promptResult, versionsResult, contentResult] = await Promise.all([
    promptService.byId(id),
    promptService.versions(id),
    promptService.currentContent(id),
  ]);
  if (!promptResult.ok) notFound();
  const prompt = promptResult.data;
  const versions = versionsResult.ok ? versionsResult.data : [];
  const content = contentResult.ok ? contentResult.data : '';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title={prompt.name}
        description={`${PROMPT_KIND_LABELS[prompt.kind]} · ${versions.length} version${versions.length === 1 ? '' : 's'}`}
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Prompts', href: '/admin/ai/prompts' }, { label: prompt.name }]}
        actions={<StatusBadge status={prompt.publishStatus} />}
      />
      <PromptEditor promptId={prompt.id} currentContent={content} currentVersion={prompt.currentVersion} versions={versions} />
    </div>
  );
}
