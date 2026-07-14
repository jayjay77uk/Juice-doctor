import Link from 'next/link';
import { TrendingUp, Target, Droplets, Moon, CalendarDays, ArrowRight } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatGrid, StatCard } from '@/components/admin/stat-card';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { member } from '@/services/member';
import type { PillarProgress, UpcomingItem, Recommendation } from '@/services/member';
import type { Goal } from '@/types/health';

export const metadata = createMetadata({ title: 'Dashboard', path: '/dashboard' });

const emptyProgress: PillarProgress = {
  pillarOne: 0,
  pillarTwo: 0,
  pillarThree: 0,
  pillarFour: 0,
  pillarFive: 0,
  overall: 0,
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const [progressR, upcomingR, recommendationsR, goalsR] = await Promise.all([
    member.progress(),
    member.upcoming(),
    member.recommendations(),
    member.goals(),
  ]);

  const progress: PillarProgress = progressR.ok ? progressR.data : emptyProgress;
  const upcoming: UpcomingItem[] = upcomingR.ok ? upcomingR.data : [];
  const recommendations: Recommendation[] = recommendationsR.ok ? recommendationsR.data : [];
  const goals: Goal[] = goalsR.ok ? goalsR.data : [];

  const pillars: { label: string; value: number }[] = [
    { label: 'Pillar One', value: progress.pillarOne },
    { label: 'Pillar Two', value: progress.pillarTwo },
    { label: 'Pillar Three', value: progress.pillarThree },
    { label: 'Pillar Four', value: progress.pillarFour },
    { label: 'Pillar Five', value: progress.pillarFive },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {denied === '1' ? (
        <div role="alert" className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
          <span className="font-medium text-danger">Access denied.</span> You don&apos;t have permission to
          view that area, so we&apos;ve brought you back to your dashboard.
        </div>
      ) : null}
      <AdminHeader
        title="Welcome back"
        description="Week 3 of your account — here's where things stand."
        actions={
          <Button asChild>
            <Link href="/dashboard/onboarding">Resume onboarding</Link>
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="Overall score" value={`${progress.overall}/100`} icon={TrendingUp} />
        <StatCard label="Active goals" value={goals.length} icon={Target} />
        <StatCard label="Pillar One" value={`${progress.pillarOne}/100`} icon={Droplets} />
        <StatCard label="Pillar Three" value={`${progress.pillarThree}/100`} icon={Moon} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Your Framework pillars this week">
          <ul className="flex flex-col gap-4">
            {pillars.map((pillar) => (
              <li key={pillar.label} className="flex items-center gap-4">
                <span className="w-24 shrink-0 text-sm font-medium text-foreground">
                  {pillar.label}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-secondary"
                    style={{ width: `${pillar.value}%` }}
                  />
                </span>
                <span className="w-9 text-right text-sm tabular-nums text-muted-foreground">
                  {pillar.value}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Upcoming">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled yet"
              description="Your sessions and check-ins will appear here as you book them."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl bg-surface-muted p-4"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-primary">
                    <CalendarDays className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.when}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Recommended for you" padded={false}>
        {recommendations.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={ArrowRight}
              title="No recommendations right now"
              description="As you complete your check-ins, we'll surface ideas tailored to you."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recommendations.map((rec) => (
              <li key={rec.href}>
                <Link
                  href={rec.href}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{rec.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                  <ArrowRight className="size-4.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — sample data. AI replies are live but not clinically reviewed. No real health records, bookings or payments are connected.
      </p>
    </div>
  );
}
