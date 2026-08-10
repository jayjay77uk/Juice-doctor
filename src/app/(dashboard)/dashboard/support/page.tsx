import { LifeBuoy } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
import { SupportForm } from '@/components/dashboard/support-form';
import { support } from '@/services/support';

export const metadata = createMetadata({ title: 'Support', path: '/dashboard/support' });

export default async function SupportPage() {
  const result = await support.listForMember();
  const tickets = result.ok ? result.data : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader title="Support" description="Ask a question and review your past requests." />

      <Panel title="Request support" description="Send us a note and a member of the team will follow up.">
        <SupportForm />
      </Panel>

      <Panel title="Your requests" padded={false}>
        {tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No requests yet"
            description="When you send a support request, it will appear here so you can track it."
          />
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="flex flex-col gap-2 px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-medium text-foreground">{ticket.subject}</p>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={ticket.status} />
                    <time className="text-xs text-muted-foreground" dateTime={ticket.createdAt}>
                      {ticket.createdAt.slice(0, 10)}
                    </time>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{ticket.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-sm text-muted-foreground">
        Support requests are saved to your account and reviewed by the team. No email confirmation is sent.
      </p>
    </div>
  );
}
