import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { Media } from '@/components/ui/media';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'About us',
  description: 'This is placeholder text in clear English. Final approved wording will be supplied later.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="About us"
        lede="This is placeholder text in clear English. Final approved wording will be supplied later."
      />

      <Section tone="default" spacing="lg">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Media
            image={{ alt: 'Placeholder image', tone: 'teal', ratio: '4/5' }}
            className="shadow-[var(--shadow-soft)]"
          />
          <div className="flex flex-col gap-5">
            <SectionHeading eyebrow="Our story" title="Who we are" />
            <p className="measure text-lg text-muted-foreground">This is placeholder text in clear English. Final approved wording will be supplied later.</p>
            <p className="measure text-muted-foreground">
              This is placeholder text in clear English. It stands in for the final content until approved wording is supplied.
            </p>
            <div>
              <Button asChild intent="outline">
                <Link href={routes.founder.href}>
                  Meet the founder <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="sage" spacing="lg">
        <SectionHeading
          eyebrow="Our values"
          title="What we stand for"
          intro="This is placeholder text in clear English. Final approved wording will be supplied later."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { t: 'Value one', d: 'This is placeholder text in clear English. Final approved wording will be supplied later.' },
            { t: 'Value two', d: 'This is placeholder text in clear English. Final approved wording will be supplied later.' },
            { t: 'Value three', d: 'This is placeholder text in clear English. Final approved wording will be supplied later.' },
          ].map((v, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-serif text-lg text-foreground">{v.t}</h3>
              <p className="mt-2 text-muted-foreground">{v.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
