import Link from 'next/link';
import { User, Bell, Shield, Settings } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';

export const metadata = createMetadata({ title: 'Settings' });

const profileRows: { label: string; value: string }[] = [
  { label: 'Name', value: 'Prototype User' },
  { label: 'Email', value: 'hello@example.com' },
];

const notificationToggles: { id: string; label: string; hint: string }[] = [
  {
    id: 'email-checkins',
    label: 'Email check-ins',
    hint: 'A short weekly note on how your programme is going.',
  },
  {
    id: 'daily-nudges',
    label: 'Daily nudges',
    hint: 'Gentle reminders to stay on track.',
  },
  {
    id: 'share-practitioner',
    label: 'Share with practitioner',
    hint: 'Let your practitioner see your progress ahead of sessions.',
  },
];

export default async function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Settings"
        description="Manage your account and preferences."
      />

      <Panel
        title="Profile"
        description="The basics we use to personalise your experience."
      >
        <dl className="divide-y divide-border">
          {profileRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="size-4 text-primary" />
                {row.label}
              </dt>
              <dd className="text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel
        title="Notifications"
        description="Choose how you'd like us to stay in touch."
      >
        <div className="flex flex-col gap-1">
          {notificationToggles.map((toggle) => (
            <label
              key={toggle.id}
              htmlFor={toggle.id}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-surface-muted"
            >
              <span className="flex items-start gap-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{toggle.label}</span>
                  <span className="text-sm text-muted-foreground">{toggle.hint}</span>
                </span>
              </span>
              <input
                id={toggle.id}
                type="checkbox"
                defaultChecked
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
              />
            </label>
          ))}
        </div>
      </Panel>

      <Panel
        title="Privacy & data"
        description="You're always in control of your information."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button intent="outline">
              <Shield className="size-4" />
              Download my data
            </Button>
            <Button asChild intent="ghost">
              <Link href="/privacy">Manage consents</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Your data is GDPR-backed — you can export it or withdraw consent at any time,
            and we’ll only ever use it to support your experience.
          </p>
        </div>
      </Panel>

      <Panel
        title="Danger zone"
        description="Take a break or step away — your progress stays safe."
        className="border-danger/40"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Deactivating pauses your membership and hides your profile. You can come back
            whenever you’re ready.
          </p>
          <div>
            <Button intent="outline" className="border-danger/50 text-danger hover:bg-danger/5">
              <Settings className="size-4" />
              Deactivate account
            </Button>
          </div>
        </div>
      </Panel>

      <p className="text-sm text-muted-foreground">
        Prototype — sample data. No real records, AI, or bookings are connected. These
        controls are for demonstration only and won’t change any settings.
      </p>
    </div>
  );
}
