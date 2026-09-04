import Link from 'next/link';
import Image from 'next/image';
import { Compass, ArrowRight, Users, Clock, GitBranch } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { getSession } from '@/services/auth';
import { subscriptionsService } from '@/services/subscriptions';
import { carePlan, timeline } from '@/services/herne/care-plan';
import { referralEngine } from '@/services/herne/referrals';
import { websiteProfiles, websiteProfile } from '@/data/herne/website-profiles';
import { StartChatButton } from '@/components/dashboard/start-chat-button';

export const metadata = createMetadata({ title: 'My specialists', path: '/dashboard/specialists' });
export const dynamic = 'force-dynamic';

export default async function MySpecialistsPage() {
  const session = await getSession();
  const userId = session?.user.id;
  const plan = userId ? await carePlan.get(userId) : null;
  const [events, referrals, accessResult] = userId
    ? await Promise.all([
        timeline.list(userId, 5),
        referralEngine.listForUser(userId),
        subscriptionsService.memberAccess(userId),
      ])
    : [[], [], { ok: true as const, data: ['makela'] }];

  const contributing = (plan?.assignedSpecialists ?? [])
    .map((s) => websiteProfile(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const latest = events[0] ?? null;
  const lastReferral = referrals[0] ?? null;
  const all = websiteProfiles();
  const accessible = new Set(accessResult.ok ? accessResult.data : ['makela']);
  const available = all.filter((s) => accessible.has(s.slug));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <AdminHeader
        title="My specialists"
        description="Choose a specialist and start a conversation directly from your dashboard."
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/care-plan">View my care plan</Link>
          </Button>
        }
      />

      <Panel title="Your concierge">
        <div className="flex items-center gap-4">
          <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-[#12233a]">
            <Image src="/specialists/makela.png" alt="Makela" fill sizes="64px" className="object-cover object-top" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Makela · Wellbeing Concierge</p>
            <p className="text-sm text-muted-foreground">Listens first, coordinates your team, and keeps every recommendation aligned.</p>
          </div>
          <StartChatButton agentId="makela" label="Chat with Makela" />
        </div>
      </Panel>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Users className="size-4" /> Available specialists</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{available.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Clock className="size-4" /> Latest interaction</p>
          <p className="mt-1 text-sm text-foreground">{latest ? latest.title : 'No activity yet'}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><GitBranch className="size-4" /> Referral status</p>
          <p className="mt-1 text-sm text-foreground">
            {lastReferral ? `Handed to ${String(lastReferral.to_human_role ?? websiteProfile(String(lastReferral.to_specialist ?? ''))?.name ?? '—')}` : 'No referrals yet'}
          </p>
        </div>
      </div>

      <Panel title="Start a conversation" padded={false}>
        {available.length === 0 ? (
          <div className="p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">No specialists are currently available on your plan.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {available.map((s) => (
              <li key={s.slug} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-[#12233a]">
                  <Image src={`/specialists/${s.slug}.png`} alt="" fill sizes="48px" className="object-cover object-top" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.title}</p>
                </div>
                <StartChatButton agentId={s.slug} label="Start chat" />
                <Button asChild size="sm" intent="ghost">
                  <Link href={`/specialists/${s.slug}`}>Profile</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Your care-plan team" padded={false}>
        {contributing.length === 0 ? (
          <div className="flex items-center justify-between gap-3 p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">Your assigned specialists will appear here as Makela coordinates your care plan.</p>
            <Button asChild size="sm" intent="ghost"><Link href="/specialists">Meet the team <ArrowRight className="ml-1 size-4" /></Link></Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {contributing.map((s) => (
              <li key={s.slug} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#12233a] font-serif text-[#c9a961]">{s.name.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.title}</p>
                </div>
                <StartChatButton agentId={s.slug} label="Start chat" />
                <Button asChild size="sm" intent="ghost"><Link href={`/specialists/${s.slug}`}>Profile</Link></Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Explore the full team" padded={false}>
        <ul className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {all.map((s) => (
            <li key={s.slug} className="bg-surface">
              <Link href={`/specialists/${s.slug}`} className="flex flex-col items-center gap-2 p-4 text-center hover:bg-surface-muted">
                <Compass className="size-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
