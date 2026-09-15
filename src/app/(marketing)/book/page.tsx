import Link from 'next/link';
import { createMetadata } from '@/config/metadata';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Button } from '@/components/ui/button';
import { getSession } from '@/services/auth';

export const metadata = createMetadata({ title: 'Book an Audio Call', description: 'Request a 15-minute Audio Call with the team.', path: '/book' });

export default async function BookPage() {
  const session = await getSession();
  return <>
    <PageHero eyebrow="Book" title="Book a 15-minute Audio Call" lede="Choose a preferred time from your member account. The team will confirm availability before your appointment." />
    <Section tone="default" spacing="lg" containerSize="narrow">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-h2">Audio Call</h2>
        <p>Your request is saved in your account, where you can check its status, reschedule or cancel. No video appointment is required.</p>
        <p className="text-sm text-muted-foreground">Price on request. Submitting a request does not take payment or guarantee a time slot.</p>
        <Button asChild><Link href={session ? '/dashboard/bookings' : '/login?next=%2Fdashboard%2Fbookings'}>{session ? 'Choose a preferred time' : 'Sign in to request a call'}</Link></Button>
        {!session && <Link href="/register" className="text-primary underline">Create an account</Link>}
      </div>
    </Section>
  </>;
}
