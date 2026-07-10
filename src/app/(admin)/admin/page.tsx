import type { Metadata } from 'next';
import { Users, CalendarCheck, Inbox, FileText } from 'lucide-react';
import { createMetadata } from '@/config/metadata';

export const metadata: Metadata = createMetadata({ title: 'Admin', path: '/admin' });

const stats = [
  { label: 'Active clients', value: '48', icon: Users },
  { label: 'Bookings this week', value: '12', icon: CalendarCheck },
  { label: 'New messages', value: '5', icon: Inbox },
  { label: 'Published resources', value: '4', icon: FileText },
];

const bookings = [
  { name: 'Rachel Adeyemi', service: 'Body MOT', when: 'Mon 14 Jul · 9:00am', status: 'Confirmed' },
  { name: 'Tom Blake', service: 'Discovery Call', when: 'Mon 14 Jul · 2:30pm', status: 'Requested' },
  { name: 'Priya Shah', service: '21-Day Reset', when: 'Wed 16 Jul · 11:00am', status: 'Confirmed' },
  { name: 'Marcus Cole', service: 'Follow-up', when: 'Thu 17 Jul · 4:00pm', status: 'Requested' },
];

const statusStyle: Record<string, string> = {
  Confirmed: 'bg-green-100 text-secondary',
  Requested: 'bg-amber-50 text-amber-700',
};

export default function AdminPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">Practice overview</p>
        <h1 className="text-h2">Admin dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-5">
            <span className="grid size-9 place-items-center rounded-full bg-teal-100 text-primary">
              <s.icon className="size-4.5" />
            </span>
            <p className="mt-4 font-serif text-3xl text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent bookings table */}
      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-serif text-lg text-foreground">Recent bookings</h2>
          <span className="text-sm text-muted-foreground">Sample data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Service</th>
                <th className="px-6 py-3 font-medium">When</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.name} className="border-b border-border last:border-0">
                  <td className="px-6 py-4 font-medium text-foreground">{b.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{b.service}</td>
                  <td className="px-6 py-4 text-muted-foreground">{b.when}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[b.status] ?? 'bg-surface-muted text-muted-foreground'}`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
        Prototype — the admin dashboard demonstrates how the practice would manage clients, bookings
        and content. It is backed by sample data; no records are stored or editable yet.
      </p>
    </div>
  );
}
