import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mic, Users, Building2 } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { ph } from '@/content/placeholder';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Speaking',
  description: ph.metaDescription,
  path: '/speaking',
});

const formats = [
  {
    icon: Mic,
    title: 'Keynote talks',
    body: 'This is placeholder text in clear English. Final wording will be supplied later.',
  },
  {
    icon: Users,
    title: 'Workshops',
    body: 'This is placeholder text in clear English. Final wording will be supplied later.',
  },
  {
    icon: Building2,
    title: 'Corporate sessions',
    body: 'This is placeholder text in clear English. Final wording will be supplied later.',
  },
];

const topics = [
  'Topic one — placeholder speaking topic in clear English.',
  'Topic two — placeholder speaking topic in clear English.',
  'Topic three — placeholder speaking topic in clear English.',
  'Topic four — placeholder speaking topic in clear English.',
];

export default function SpeakingPage() {
  return (
    <>
      <PageHero
        eyebrow="Speaking"
        title="Speaking"
        lede="This is placeholder text in clear English. Final wording about speaking engagements will be supplied later."
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
          {formats.map((f, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
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
        <SectionHeading eyebrow="Topics" title="Talk topics" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {topics.map((t, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface px-5 py-4 font-serif text-lg text-foreground">
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Full talk details, past events and booking terms are pending client-supplied copy.
        </p>
      </Section>

      <CtaSection
        title="Book a talk"
        primaryLabel="Get in touch"
        primaryHref={routes.contact.href}
        secondaryLabel="About the speaker"
        secondaryHref={routes.founder.href}
      />
    </>
  );
}
