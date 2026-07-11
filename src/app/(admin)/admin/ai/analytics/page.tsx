import type { Metadata } from 'next';
import { MessagesSquare, Users, Bot, TrendingUp, Clock, Smile, Coins, Banknote, PhoneCall, CheckCircle2, CircleAlert, LifeBuoy, Lightbulb, CreditCard, UserCheck, ListChecks } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { analytics } from '@/services/analytics';
import { AdminHeader } from '@/components/admin/admin-header';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { Panel } from '@/components/admin/panel';
import { MiniBarChart } from '@/components/admin/mini-chart';

export const metadata: Metadata = createMetadata({ title: 'AI Analytics' });

function gbp(micros: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(micros / 1_000_000);
}

export default async function AnalyticsPage() {
  const [summaryResult, dailyResult, questionsResult, usageResult, operationalResult] = await Promise.all([
    analytics.summary(),
    analytics.daily(30),
    analytics.popularQuestions(),
    analytics.knowledgeUsage(),
    analytics.operational(),
  ]);
  const s = summaryResult.ok ? summaryResult.data : null;
  const daily = dailyResult.ok ? dailyResult.data : [];
  const questions = questionsResult.ok ? questionsResult.data : [];
  const usage = usageResult.ok ? usageResult.data : [];
  const ops = operationalResult.ok ? operationalResult.data : null;

  const convChart = daily.map((d) => ({ label: d.day.slice(5), value: d.conversations }));
  const maxUsage = Math.max(1, ...usage.map((u) => u.retrievals));
  const maxSpecialistUsage = Math.max(1, ...(ops?.specialistUsage.map((u) => u.conversations30d) ?? []));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="AI Analytics"
        description="Usage, satisfaction, cost and knowledge insights across all AI assistants. Figures are illustrative in the prototype."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Analytics' }]}
      />

      <StatGrid>
        <StatCard label="Conversations (30d)" value={s ? s.totalConversations.toLocaleString() : '—'} icon={MessagesSquare} trend={{ value: '+12%', direction: 'up' }} />
        <StatCard label="Active users" value={s ? s.activeUsers.toLocaleString() : '—'} icon={Users} />
        <StatCard label="Active agents" value={s?.activeAgents ?? 0} icon={Bot} />
        <StatCard label="Escalation rate" value={s ? `${(s.escalationRate * 100).toFixed(1)}%` : '—'} icon={TrendingUp} />
      </StatGrid>
      <StatGrid>
        <StatCard label="Avg response" value={s ? `${(s.avgResponseMs / 1000).toFixed(1)}s` : '—'} icon={Clock} />
        <StatCard label="Satisfaction" value={s ? `${(s.satisfaction * 100).toFixed(0)}%` : '—'} icon={Smile} />
        <StatCard label="Tokens (month)" value={s ? `${(s.tokensThisMonth / 1_000_000).toFixed(1)}M` : '—'} icon={Coins} />
        <StatCard label="Cost (month)" value={s ? gbp(s.costThisMonthMicros) : '—'} icon={Banknote} />
      </StatGrid>

      <Panel title="Conversations — last 30 days">
        <MiniBarChart data={convChart} ariaLabel="Daily conversations over the last 30 days" />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Popular questions" padded={false}>
          <ol className="divide-y divide-border">
            {questions.map((q, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-6 py-3.5">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm text-foreground">{q.question}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{q.count}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Knowledge usage">
          <ul className="flex flex-col gap-4">
            {usage.map((u) => (
              <li key={u.documentTitle} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate text-foreground">{u.documentTitle}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{u.retrievals}</span>
                </div>
                <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <span className="block h-full rounded-full bg-secondary" style={{ width: `${(u.retrievals / maxUsage) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <AdminHeader
        title="Operational analytics"
        description="Reception, consultations, subscriptions and customer follow-up across the AI assistants. Figures are illustrative in the prototype."
      />

      <StatGrid>
        <StatCard label="Receptionist conversations" value={ops ? ops.receptionistConversations.toLocaleString() : '—'} icon={PhoneCall} />
        <StatCard label="Completed consultations" value={ops ? ops.completedConsultations.toLocaleString() : '—'} icon={CheckCircle2} />
        <StatCard label="Unresolved consultations" value={ops ? ops.unresolvedConsultations.toLocaleString() : '—'} icon={CircleAlert} />
        <StatCard label="Human escalations" value={ops ? ops.humanEscalations.toLocaleString() : '—'} icon={LifeBuoy} />
      </StatGrid>
      <StatGrid>
        <StatCard label="Recommendations" value={ops ? ops.recommendations.toLocaleString() : '—'} icon={Lightbulb} />
        <StatCard label="Subscriptions" value={ops ? ops.subscriptions.toLocaleString() : '—'} icon={CreditCard} />
        <StatCard label="Active customers" value={ops ? ops.activeCustomers.toLocaleString() : '—'} icon={UserCheck} />
        <StatCard label="Follow-up completion" value={ops ? `${(ops.followUpCompletion * 100).toFixed(0)}%` : '—'} icon={ListChecks} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Specialist usage" description="Conversations per specialist over the last 30 days.">
          {ops && ops.specialistUsage.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {ops.specialistUsage.map((u) => (
                <li key={u.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate text-foreground">{u.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{u.conversations30d}</span>
                  </div>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <span className="block h-full rounded-full bg-secondary" style={{ width: `${(u.conversations30d / maxSpecialistUsage) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specialist usage yet.</p>
          )}
        </Panel>

        <Panel title="Customer feedback" description="Thumbs up and down from customers on AI responses.">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">👍</span>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{ops ? ops.feedback.up.toLocaleString() : '—'}</span>
              <span className="text-xs text-muted-foreground">Positive</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">👎</span>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{ops ? ops.feedback.down.toLocaleString() : '—'}</span>
              <span className="text-xs text-muted-foreground">Negative</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
