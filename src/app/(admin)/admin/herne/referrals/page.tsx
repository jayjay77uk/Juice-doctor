import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, GitBranch, AlertTriangle } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { referralRules, type ReferralRule } from '@/services/herne/referrals';
import { listReferrals, listEscalations, type AdminReferral, type AdminEscalation } from '@/services/herne/admin';

export const metadata: Metadata = createMetadata({ title: 'HERNE referrals' });
export const dynamic = 'force-dynamic';

function urgencyBadge(u: string | null) {
  if (!u) return <span className="text-muted-foreground">—</span>;
  const tone = /immediate|emergency|urgent/i.test(u) ? 'accent' : 'outline';
  return <Badge tone={tone}>{u}</Badge>;
}

export default async function HerneReferralsPage() {
  const [rules, referrals, escalations] = await Promise.all([referralRules.list(), listReferrals(25), listEscalations(25)]);

  const ruleColumns: Column<ReferralRule>[] = [
    { header: 'From', cell: (r) => <span className="font-medium capitalize text-foreground">{r.fromSpecialist}</span> },
    { header: 'To', cell: (r) => <span className="capitalize">{r.isHumanEscalation ? `${r.toSpecialist} (human)` : r.toSpecialist}</span> },
    { header: 'Trigger', cell: (r) => <span className="text-muted-foreground">{r.trigger}</span> },
    { header: 'Urgency', cell: (r) => urgencyBadge(r.urgency) },
    { header: 'Type', align: 'right', cell: (r) => (r.isHumanEscalation ? <Badge tone="accent">Human escalation</Badge> : <Badge tone="neutral">Specialist</Badge>) },
  ];

  const referralColumns: Column<AdminReferral>[] = [
    { header: 'From', cell: (r) => <span className="font-medium capitalize text-foreground">{r.fromSpecialist}</span> },
    { header: 'To', cell: (r) => <span className="capitalize">{r.toHumanRole ? `${r.toHumanRole} (human)` : r.toSpecialist ?? '—'}</span> },
    { header: 'Reason', cell: (r) => <span className="text-muted-foreground">{r.reason ?? r.trigger ?? '—'}</span> },
    { header: 'Status', cell: (r) => <Badge tone="outline">{r.status}</Badge> },
    { header: 'When', align: 'right', cell: (r) => <span className="text-muted-foreground tabular-nums">{new Date(r.createdAt).toLocaleDateString('en-GB')}</span> },
  ];

  const escalationColumns: Column<AdminEscalation>[] = [
    { header: 'Trigger', cell: (r) => <span className="font-medium text-foreground">{r.trigger}</span> },
    { header: 'Specialist', cell: (r) => <span className="capitalize">{r.specialist ?? '—'}</span> },
    { header: 'Destination', cell: (r) => <span className="text-muted-foreground">{r.destination ?? '—'}</span> },
    { header: 'Urgency', cell: (r) => urgencyBadge(r.urgency) },
    { header: 'When', align: 'right', cell: (r) => <span className="text-muted-foreground tabular-nums">{new Date(r.createdAt).toLocaleDateString('en-GB')}</span> },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <Link href="/admin/herne" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> HERNE Intelligence
        </Link>
        <AdminHeader
          title="Referrals & escalations"
          description="The client referral matrix, the live referral log, and human escalations. Rules are loaded from the client matrix; referrals and escalations are produced by the runtime engines."
        />
      </div>

      <Panel title={`Referral matrix — ${rules.length} rules`} description="Who hands to whom, and when" padded={false}>
        <DataTable
          columns={ruleColumns}
          rows={rules}
          getKey={(r, i) => `${r.fromSpecialist}-${r.toSpecialist}-${r.trigger}-${i}`}
          empty={<EmptyState icon={GitBranch} title="No referral rules yet" description="Seed the referral matrix from the client pack via the HERNE ingestion route." />}
        />
      </Panel>

      <Panel title="Referral log" description="Recent handoffs, full context preserved" padded={false}>
        <DataTable
          columns={referralColumns}
          rows={referrals}
          getKey={(r) => r.id}
          empty={<EmptyState icon={GitBranch} title="No referrals logged yet" description="Referrals appear here as specialists hand people to one another." />}
        />
      </Panel>

      <Panel title="Escalations" description="Low confidence, out of scope, emergencies and human review" padded={false}>
        <DataTable
          columns={escalationColumns}
          rows={escalations}
          getKey={(r) => r.id}
          empty={<EmptyState icon={AlertTriangle} title="No escalations yet" description="Escalations appear here when a person needs human clinical review." />}
        />
      </Panel>
    </div>
  );
}
