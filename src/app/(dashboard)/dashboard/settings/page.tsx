import Link from 'next/link';
import { User, Bell, Shield, Settings } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { LanguageVoiceCard } from '@/components/settings/language-voice-card';
import { getLanguagePreference } from '@/services/herne/language-store';
import { MemoryCard } from '@/components/settings/memory-card';
import { getMemoryEnabled } from '@/services/memory-prefs';
import { memoryRepo } from '@/services/repositories/memory-repo';
import { getSession } from '@/services/auth';

export const metadata = createMetadata({ title: 'Settings' });
export const dynamic = 'force-dynamic';

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
  const session = await getSession();
  const [languagePreference, memoryEnabled, memories] = await Promise.all([
    getLanguagePreference(),
    getMemoryEnabled(),
    session?.user.id ? memoryRepo.listForUser(session.user.id) : Promise.resolve([]),
  ]);
  const profileRows: { label: string; value: string }[] = [
    { label: 'Name', value: session?.user.name || session?.user.email?.split('@')[0] || 'Member' },
    { label: 'Email', value: session?.user.email ?? '—' },
  ];
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

      <LanguageVoiceCard initial={languagePreference} />

      <MemoryCard enabled={memoryEnabled} memories={memories} />

      <Panel
        title="Notification preferences"
        description="Coming soon — choose how you'd like us to stay in touch."
      >
        <div className="flex flex-col gap-1">
          {notificationToggles.map((toggle) => (
            <label
              key={toggle.id}
              htmlFor={toggle.id}
              className="flex cursor-not-allowed items-start justify-between gap-4 rounded-xl px-3 py-3 opacity-60"
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
                disabled
                title="Coming soon"
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">These preferences are coming soon and can’t be changed yet.</p>
      </Panel>

      <Panel
        title="Privacy & data"
        description="You're always in control of your information."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button intent="outline" disabled title="Data export is coming soon">
              <Shield className="size-4" />
              Download my data (coming soon)
            </Button>
            <Button asChild intent="ghost">
              <Link href="/privacy">Privacy policy</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Your data is GDPR-backed. Self-service export and consent management are coming soon —
            in the meantime, contact the team for any data request.
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
            Deactivating pauses your membership and hides your profile. Self-service deactivation is
            coming soon — contact the team if you’d like your account paused.
          </p>
          <div>
            <Button intent="outline" disabled title="Coming soon" className="border-danger/50 text-danger">
              <Settings className="size-4" />
              Deactivate account (coming soon)
            </Button>
          </div>
        </div>
      </Panel>

      <p className="text-sm text-muted-foreground">
        Your profile, language, memory and subscription settings are live. Notification preferences,
        data export and account deactivation are coming soon.
      </p>
    </div>
  );
}
