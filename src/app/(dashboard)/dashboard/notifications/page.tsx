import { Bell } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { EmptyState } from '@/components/admin/empty-state';
import { member } from '@/services/member';
import { markAllNotificationsReadAction } from '@/services/member-actions';

export const metadata = createMetadata({ title: 'Notifications', path: '/dashboard/notifications' });
export const dynamic = 'force-dynamic';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function NotificationsPage() {
  const result = await member.notifications();
  const notifications = result.ok ? result.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader title="Notifications" description="Reminders, milestones and updates." />

      <Panel
        padded={false}
        actions={
          notifications.some((n) => n.readAt === null) ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="text-sm font-medium text-primary hover:text-primary/80">
                Mark all as read
              </button>
            </form>
          ) : undefined
        }
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="Reminders, milestones and updates from your programme will appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => {
              const unread = n.readAt === null;
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 sm:px-6 ${
                    unread ? 'bg-teal-50' : ''
                  }`}
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
                    <Bell className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{n.title}</p>
                      {unread && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-teal-500"
                          aria-label="Unread"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={n.createdAt}>
                    {formatWhen(n.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — sample data. AI replies are live but not clinically reviewed. No real health records, bookings or payments are connected.
      </p>
    </div>
  );
}
