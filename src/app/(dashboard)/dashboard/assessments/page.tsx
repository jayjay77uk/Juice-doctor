import Link from 'next/link';
import { ClipboardList, Activity } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { member } from '@/services/member';

export const metadata = createMetadata({
  title: 'Assessments',
  description: 'Your assessment and scan results over time.',
});

function humanise(value: string): string {
  return value.replace(/_/g, ' ');
}

export default async function AssessmentsPage() {
  const result = await member.assessments();
  const assessments = result.ok ? result.data : [];

  const total = assessments.length;
  const reviewed = assessments.filter((a) => a.status === 'reviewed').length;
  const latest = assessments[0];
  const latestScore = latest && latest.score !== null ? `${latest.score}/100` : '—';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Assessments"
        description="Your assessment and scan results over time."
      />

      <StatGrid>
        <StatCard label="Total assessments" value={total} icon={ClipboardList} />
        <StatCard label="Latest score" value={latestScore} icon={Activity} />
        <StatCard label="Reviewed" value={reviewed} icon={ClipboardList} />
      </StatGrid>

      {assessments.length === 0 ? (
        <Panel>
          <EmptyState
            title="No assessments yet"
            description="Your assessment and scan results will appear here once your first check-in is complete."
          />
        </Panel>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {assessments.map((assessment) => (
            <Panel
              key={assessment.id}
              title={assessment.title}
              actions={<StatusBadge status={assessment.status} />}
            >
              <div className="flex flex-col gap-4">
                <p className="font-serif text-4xl text-primary">
                  {assessment.score !== null ? `${assessment.score}/100` : '—'}
                </p>
                <dl className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Type</dt>
                    <dd className="font-medium capitalize text-foreground">
                      {humanise(assessment.type)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Date</dt>
                    <dd className="font-medium text-foreground">
                      {assessment.createdAt.slice(0, 10)}
                    </dd>
                  </div>
                </dl>
                <Button intent="outline" className="w-full" disabled title="Detailed results view is coming soon">
                  View details (coming soon)
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Prototype — sample data. AI replies are live but not clinically reviewed. No real records, bookings or payments are connected.
      </p>
    </div>
  );
}
