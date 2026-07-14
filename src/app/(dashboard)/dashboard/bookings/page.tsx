import Link from 'next/link';
import { CalendarDays, CalendarPlus } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { member } from '@/services/member';

export const metadata = createMetadata({ title: 'Your bookings', path: '/dashboard/bookings' });

// prototype mock — a couple of past sessions to show the completed history
const pastSessions: { title: string; when: string; status: string }[] = [
  { title: 'Intro consultation with your specialist', when: 'Mon 23 Jun · 10:00am', status: 'completed' },
  { title: 'Week 1 progress review', when: 'Wed 2 Jul · 2:30pm', status: 'completed' },
];

export default async function BookingsPage() {
  const upcomingResult = await member.upcoming();
  const upcoming = upcomingResult.ok ? upcomingResult.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Your bookings"
        description="Upcoming sessions and appointments."
        actions={
          <Button asChild size="sm">
            <Link href="/book">Book a session</Link>
          </Button>
        }
      />

      <Panel
        title="Upcoming sessions"
        description="Your next few appointments, all in one place."
        padded={false}
      >
        {upcoming.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              icon={CalendarPlus}
              title="Nothing on the calendar yet"
              description="When you're ready, book a session and it will show up right here. We can't wait to support you."
              action={
                <Button asChild size="sm">
                  <Link href="/book">Book your first session</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((item, i) => (
              <li
                key={`${item.title}-${i}`}
                className="flex items-center gap-4 px-5 py-4 sm:px-6"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
                  <CalendarDays className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.when}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status="confirmed" />
                  <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {item.type}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Past sessions"
        description="A look back at the sessions you've already completed."
        padded={false}
      >
        <ul className="divide-y divide-border">
          {pastSessions.map((item, i) => (
            <li
              key={`${item.title}-${i}`}
              className="flex items-center gap-4 px-5 py-4 sm:px-6"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground">
                <CalendarDays className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.when}</p>
              </div>
              <div className="shrink-0">
                <StatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — sample data. AI replies are live but not clinically reviewed. No real records, bookings or payments are connected.
      </p>
    </div>
  );
}
