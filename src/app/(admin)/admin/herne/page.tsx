import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Users, Database, GitBranch, ClipboardList, Activity, ShieldCheck, ArrowRight,
  Sparkles, MessageSquareText, Watch, AlertTriangle, HeartPulse,
} from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { Panel } from '@/components/admin/panel';
import { herneAdminOverview } from '@/services/herne/admin';
import { HERNE_SPECIALIST_PROFILES } from '@/data/herne/specialist-profiles';

export const metadata: Metadata = createMetadata({ title: 'HERNE' });
export const dynamic = 'force-dynamic';

const sections = [
  { href: '/admin/herne/referrals', label: 'Referrals & escalations', icon: GitBranch, desc: 'Referral matrix rules, the referral log and human escalations.' },
  { href: '/admin/herne/care-plans', label: 'Shared care plans', icon: ClipboardList, desc: 'One plan per person — goals, contributing specialists and actions.' },
  { href: '/admin/herne/wearable', label: 'Wearable data', icon: Watch, desc: 'Metric catalogue, specialist permissions, consents and AI access logs.' },
  { href: '/admin/herne/dna', label: 'Shared DNA', icon: ShieldCheck, desc: 'The values every specialist upholds — edit and publish.' },
  { href: '/admin/specialists', label: 'Specialist profiles', icon: Sparkles, desc: 'Configure each specialist agent (roles, scopes, config).' },
  { href: '/admin/ai/prompts', label: 'Prompt versions', icon: MessageSquareText, desc: 'Versioned starter prompts with a publishing workflow.' },
];

export default async function HerneAdminPage() {
  const o = await herneAdminOverview();
  const specialists = HERNE_SPECIALIST_PROFILES; // already ordered concierge-first

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="HERNE Intelligence"
        description="The multi-specialist layer — one shared evidence base, one care plan, coordinated referrals and wearable-aware guidance. These figures are read live from the database."
      />

      {!o.configured && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          The database is not configured in this environment, so figures show zero. Connect Supabase to see live HERNE data.
        </p>
      )}

      <StatGrid>
        <StatCard label="Specialists" value={o.specialists} icon={Users} hint="With HERNE config" />
        <StatCard label="Evidence records" value={o.evidenceRecords} icon={Database} hint={`${o.ingestionAudit} audit rows`} />
        <StatCard label="Referral rules" value={o.referralRules} icon={GitBranch} hint={`${o.humanEscalationRules} human escalations`} />
        <StatCard label="Active care plans" value={o.activeCarePlans} icon={ClipboardList} hint={`${o.carePlanActions} actions`} />
        <StatCard label="Referrals logged" value={o.referrals} icon={ArrowRight} />
        <StatCard label="Escalations" value={o.escalations} icon={AlertTriangle} />
        <StatCard label="Wearable metrics" value={o.wearableMetrics} icon={Watch} hint={`${o.measurements} measurements`} />
        <StatCard label="AI access logs" value={o.aiAccessLogs} icon={Activity} hint={`${o.grantedConsents} consents granted`} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Specialists" description="The eight-strong team, in concierge order" padded={false}>
          <ul className="divide-y divide-border">
            {specialists.map((s) => (
              <li key={s.specialistId} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#12233a] font-serif text-sm text-[#c9a961]">{s.name.charAt(0)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{s.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{s.title}</p>
                  </div>
                </div>
                <Link href={`/specialists/${s.specialistId}`} className="shrink-0 text-sm font-medium text-primary hover:underline">
                  View
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Manage" padded={false}>
          <ul className="divide-y divide-border">
            {sections.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="group flex items-center gap-3 px-6 py-3.5 hover:bg-surface-muted/50">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
                    <link.icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{link.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{link.desc}</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        <HeartPulse className="size-4 shrink-0 text-primary" />
        Collaboration and wearable rows are produced by the runtime engines; admin views are read-only except the shared DNA. Live Thryve is not connected — wearable figures come from the mock adapter.
      </p>
    </div>
  );
}
