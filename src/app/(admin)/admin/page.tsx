import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, Users, Banknote, ContactRound, Sparkles, TrendingUp, ArrowRight, ShieldAlert } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { business } from '@/services/business';
import { receptionist } from '@/services/receptionist';
import { specialists } from '@/services/specialists';
import { crm } from '@/services/crm';
import { AdminHeader } from '@/components/admin/admin-header';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';

export const metadata: Metadata = createMetadata({ title: 'AI Business Dashboard' });

function gbp(micros: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(micros / 100);
}

export default async function BusinessDashboardPage() {
  const [summaryResult, rStatsResult, specialistsResult, leadsResult, escalationsResult] = await Promise.all([
    business.summary(),
    receptionist.stats(),
    specialists.all(),
    crm.list(),
    crm.escalationQueue(),
  ]);
  const s = summaryResult.ok ? summaryResult.data : null;
  const rStats = rStatsResult.ok ? rStatsResult.data : null;
  const specialistList = specialistsResult.ok ? specialistsResult.data : [];
  const leads = leadsResult.ok ? leadsResult.data.slice(0, 5) : [];
  const escalations = escalationsResult.ok ? escalationsResult.data : [];

  // Top specialists by subscribers.
  const withMetrics = await Promise.all(
    specialistList.map(async (sp) => {
      const a = await specialists.analytics(sp.slug);
      return { sp, metrics: a.ok ? a.data : null };
    }),
  );
  withMetrics.sort((a, b) => (b.metrics?.activeSubscribers ?? 0) - (a.metrics?.activeSubscribers ?? 0));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="AI Business Dashboard"
        description="Run your AI business at a glance — specialists, subscriptions, leads and AI activity, all live data."
      />

      <StatGrid>
        <StatCard label="Specialist AIs" value={s?.specialists ?? 0} icon={Bot} />
        <StatCard label="Active subscribers" value={s ? s.activeSubscribers.toLocaleString() : '—'} icon={Users} hint="Active + trialing" />
        <StatCard label="Monthly recurring" value={s ? gbp(s.mrr) : '—'} icon={Banknote} hint="MRR across all specialists" />
        <StatCard label="Leads (30d)" value={s?.leads30d ?? 0} icon={ContactRound} />
      </StatGrid>

      {/* Receptionist performance */}
      <Panel title="Receptionist AI performance" description="Your front door — consultations, recommendations and escalations" actions={<Link href="/admin/receptionist" className="text-sm font-medium text-primary hover:underline">Manage</Link>}>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Consultations (30d)', value: rStats ? rStats.consultations30d.toLocaleString() : '—', icon: Sparkles },
            { label: 'Recommendation rate', value: rStats ? `${Math.round(rStats.recommendationRate * 100)}%` : '—', icon: TrendingUp },
            { label: 'Escalation rate', value: rStats ? `${Math.round(rStats.escalationRate * 100)}%` : '—', icon: ShieldAlert },
            { label: 'Avg confidence', value: rStats ? `${Math.round(rStats.avgConfidence * 100)}%` : '—', icon: TrendingUp },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-cream-50 p-4">
              <m.icon className="size-4 text-primary" />
              <p className="mt-2 font-serif text-2xl text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Top specialists */}
        <Panel title="Specialist AIs" description="Your subscription products" actions={<Link href="/admin/specialists" className="text-sm font-medium text-primary hover:underline">View all</Link>} padded={false}>
          <ul className="divide-y divide-border">
            {withMetrics.map(({ sp, metrics }) => (
              <li key={sp.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                <Link href={`/admin/specialists/${sp.id}`} className="min-w-0 font-medium text-foreground hover:text-primary">
                  {sp.name}
                </Link>
                <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
                  <span className="tabular-nums">{metrics?.activeSubscribers ?? 0} subs</span>
                  <span className="tabular-nums text-foreground">{metrics ? gbp(metrics.mrr) : '—'}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Escalation queue */}
        <Panel title="Escalation queue" description="Leads awaiting review by the escalation target" padded={false}>
          {escalations.length > 0 ? (
            <ul className="divide-y divide-border">
              {escalations.map((lead) => (
                <li key={lead.id} className="px-6 py-3.5">
                  <Link href={`/admin/crm/${lead.id}`} className="flex items-start gap-3 hover:text-primary">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{lead.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{lead.assessmentSummary}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-6 text-sm text-muted-foreground">No escalations — the receptionist is handling everything.</p>
          )}
        </Panel>
      </div>

      {/* Recent leads */}
      <Panel title="Recent leads" description="Created by the Receptionist AI" actions={<Link href="/admin/crm" className="text-sm font-medium text-primary hover:underline">Open CRM</Link>} padded={false}>
        <ul className="divide-y divide-border">
          {leads.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
              <div className="min-w-0">
                <Link href={`/admin/crm/${lead.id}`} className="font-medium text-foreground hover:text-primary">{lead.name}</Link>
                <p className="truncate text-sm text-muted-foreground">
                  {lead.recommendedSpecialistName ?? 'Escalated to human'} · {Math.round(lead.recommendationConfidence * 100)}% confidence
                </p>
              </div>
              <StatusBadge status={lead.status} />
            </li>
          ))}
        </ul>
      </Panel>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowRight className="size-4" /> Live data from the platform database. AI replies run on the live model and are not clinically reviewed. No payment provider is connected — payments are recorded manually.
      </p>
    </div>
  );
}
