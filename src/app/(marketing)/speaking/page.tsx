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
  title: ph.metaTitle,
  description: ph.metaDescription,
  path: '/speaking',
});

const formats = [
  { icon: Mic, title: ph.subheading, body: ph.body },
  { icon: Users, title: ph.subheading, body: ph.body },
  { icon: Building2, title: ph.subheading, body: ph.body },
];

const topics = [
  ph.item(1),
  ph.item(2),
  ph.item(3),
  ph.item(4),
];

export default function SpeakingPage() {
  return (
    <>
      <PageHero
        eyebrow={ph.eyebrow}
        title={ph.heading}
        lede={ph.lead}
      >
        <Button asChild size="lg">
          <Link href={routes.contact.href}>
            {ph.cta} <ArrowRight className="size-4" />
          </Link>
        </Button>
      </PageHero>

      <Section tone="default" spacing="lg">
        <SectionHeading eyebrow={ph.eyebrow} title={ph.subheading} />
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
        <SectionHeading eyebrow={ph.eyebrow} title={ph.subheading} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {topics.map((t, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface px-5 py-4 font-serif text-lg text-foreground">
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Prototype — full talk details, past events and booking terms are added with the client.
        </p>
      </Section>

      <CtaSection
        title={ph.heading}
        primaryLabel={ph.cta}
        primaryHref={routes.contact.href}
        secondaryLabel={ph.cta}
        secondaryHref={routes.founder.href}
      />
    </>
  );
}
