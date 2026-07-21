import { CalendarDays, CalendarPlus } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/sections/coming-soon';
import { member } from '@/services/member';

export const metadata = createMetadata({ title: 'Your bookings', path: '/dashboard/bookings' });


export default async function BookingsPage() {
  const upcomingResult = await member.upcoming();
  const upcoming = upcomingResult.ok ? upcomingResult.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Your bookings"
        description="Upcoming sessions and appointments."
        actions={
          <Button size="sm" disabled title="Online booking is coming soon">
            Book a session (coming soon)
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
              description="Your appointments will show up right here. Online booking is coming soon."
              action={
                <Button size="sm" disabled title="Online booking is coming soon">
                  Book your first session (coming soon)
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

      <ComingSoon
        title="Session history"
        body="A look back at your completed sessions will live here once online booking is connected."
      />

      <p className="text-sm text-muted-foreground">
        Upcoming appointments are read from your real record. Online booking and session history are coming soon.
      </p>
    </div>
  );
}
