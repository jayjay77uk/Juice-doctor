import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mic, Users, Building2 } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { site } from '@/content/site';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Speaking',
  description: `Book ${site.founder.name} to speak — keynotes and workshops on restorative health and the HERNE Protocol.`,
  path: '/speaking',
});

const formats = [
  { icon: Mic, title: 'Keynotes', body: 'An inspiring, science-grounded talk that reframes how an audience thinks about their health.' },
  { icon: Users, title: 'Workshops', body: 'Interactive sessions that turn the HERNE Protocol into practical daily habits.' },
  { icon: Building2, title: 'Corporate', body: 'Programmes for teams and organisations — energy, focus and resilience at work.' },
];

const topics = [
  'You’re not broken — you’re responsive',
  'The irrefutable power of water',
  'The five pillars of lasting energy',
  'Restoring health in a depleting world',
];

export default function SpeakingPage() {
  return (
    <>
      <PageHero
        eyebrow="Speaking"
        title="Bring restorative health to your stage"
        lede={`${site.founder.name} has shared the HERNE message with audiences from conference stages to television screens seen by millions.`}
      >
        <Button asChild size="lg">
          <Link href={routes.contact.href}>
            Enquire about speaking <ArrowRight className="size-4" />
          </Link>
        </Button>
      </PageHero>

      <Section tone="default" spacing="lg">
        <SectionHeading eyebrow="Formats" title="Ways to work together" />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {formats.map((f) => (
            <div key={f.title} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
              <span className="grid size-11 place-items-center rounded-full bg-teal-100 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="font-serif text-lg text-foreground">{f.title}</h3>
              <p className="text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="sage" spacing="lg">
        <SectionHeading eyebrow="Signature talks" title="Topics" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {topics.map((t) => (
            <li key={t} className="rounded-xl border border-border bg-surface px-5 py-4 font-serif text-lg text-foreground">
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Prototype — full talk details, past events and booking terms are added with the client.
        </p>
      </Section>

      <CtaSection
        title="Let’s talk about your event"
        primaryLabel="Enquire about speaking"
        primaryHref={routes.contact.href}
        secondaryLabel="Meet Erran"
        secondaryHref={routes.founder.href}
      />
    </>
  );
}
