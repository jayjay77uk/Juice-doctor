import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Badge } from '@/components/ui/badge';
import { SharedDnaEditor } from '@/components/admin/shared-dna-editor';
import { getSharedDna } from '@/services/herne/admin';

export const metadata: Metadata = createMetadata({ title: 'HERNE shared DNA' });
export const dynamic = 'force-dynamic';

export default async function HerneDnaPage() {
  const { dna, stored } = await getSharedDna();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <Link href="/admin/herne" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> HERNE Intelligence
        </Link>
        <AdminHeader
          title="Shared DNA"
          description="The values every specialist upholds. The runtime prompt assembler reads these into every specialist's system prompt, so a change here changes the whole team at once."
        />
      </div>

      <Panel
        title="The values every specialist upholds"
        description="Warm before knowledgeable, curious before advising, evidence-informed, honest when human review is needed…"
        actions={<Badge tone={stored ? 'secondary' : 'outline'}>{stored ? 'Saved in database' : 'Bundled default'}</Badge>}
      >
        <SharedDnaEditor initial={dna} />
      </Panel>

      <p className="flex items-start gap-2 rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        These values are HERNE shared behaviour, not per-specialist scope. Individual roles, scopes and referral rules are configured elsewhere and are not changed here.
      </p>
    </div>
  );
}
