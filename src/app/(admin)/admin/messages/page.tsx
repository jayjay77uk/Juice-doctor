import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { marketingRepo } from '@/services/repositories/marketing-repo';
import { support } from '@/services/support';
import { setContactMessageStatusAction, setSupportTicketStatusAction } from '@/services/marketing-actions';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';

export const metadata: Metadata = createMetadata({ title: 'Messages' });
export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-primary/10 text-primary',
  seen: 'bg-surface-muted text-muted-foreground',
  replied: 'bg-secondary/10 text-secondary',
};

export default async function MessagesPage() {
  const [contact, newsletter, ticketsResult] = await Promise.all([
    marketingRepo.listContactMessages(),
    marketingRepo.listNewsletterSubscribers(),
    support.listAll(),
  ]);
  const tickets = ticketsResult.ok ? ticketsResult.data : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader
        title="Messages"
        description="Contact-form messages and newsletter sign-ups, stored by the platform. Email copies wait in the outbox until the email provider is connected."
        breadcrumbs={[{ label: 'Messages' }]}
      />

      <Panel title="Contact messages" description="Messages from the public contact form. Reply from your own mailbox, then mark the message replied." padded={false}>
        {!contact.available ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            Contact-message storage is not available yet — it requires database migration 0031 (see the deployment guide). Until then the public form shows an honest “not available yet” notice.
          </p>
        ) : contact.rows.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">No contact messages yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {contact.rows.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {m.name} <span className="font-normal text-muted-foreground">&lt;{m.email}&gt;</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] ?? STATUS_STYLES.seen}`}>{m.status}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{new Date(m.createdAt).toLocaleString('en-GB')}</span>
                  </span>
                </div>
                {m.subject && <p className="text-sm font-medium text-foreground">{m.subject}</p>}
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{m.message}</p>
                <div className="flex gap-2">
                  {m.status === 'new' && (
                    <form action={setContactMessageStatusAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="status" value="seen" />
                      <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-muted">
                        Mark seen
                      </button>
                    </form>
                  )}
                  {m.status !== 'replied' && (
                    <form action={setContactMessageStatusAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="status" value="replied" />
                      <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-muted">
                        Mark replied
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Support tickets" description="Member support requests from the dashboard, with triage statuses." padded={false}>
        {tickets.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">No support tickets yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {t.subject} <span className="font-normal text-muted-foreground">— {t.memberEmail}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.status === 'resolved' ? 'bg-secondary/10 text-secondary' : t.status === 'in_progress' ? 'bg-primary/10 text-primary' : 'bg-surface-muted text-muted-foreground'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{new Date(t.createdAt).toLocaleString('en-GB')}</span>
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.message}</p>
                <div className="flex gap-2">
                  {t.status === 'open' && (
                    <form action={setSupportTicketStatusAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="status" value="in_progress" />
                      <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-muted">
                        Start
                      </button>
                    </form>
                  )}
                  {t.status !== 'resolved' && (
                    <form action={setSupportTicketStatusAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-muted">
                        Mark resolved
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Newsletter subscribers" description="Real sign-ups from the newsletter form." padded={false}>
        {!newsletter.available ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            Newsletter storage is not available yet — it requires database migration 0031. Until then the sign-up form shows an honest “not available yet” notice.
          </p>
        ) : newsletter.rows.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">No subscribers yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {newsletter.rows.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                <span className="text-foreground">{s.email}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{s.status}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{new Date(s.createdAt).toLocaleDateString('en-GB')}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
