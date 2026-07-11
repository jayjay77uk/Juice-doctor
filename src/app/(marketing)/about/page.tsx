import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { ph } from '@/content/placeholder';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { Media } from '@/components/ui/media';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: ph.metaTitle,
  description: ph.metaDescription,
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={ph.eyebrow}
        title={ph.heading}
        lede={ph.lead}
      />

      <Section tone="default" spacing="lg">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Media
            image={{ alt: ph.imageAlt, tone: 'teal', ratio: '4/5' }}
            className="shadow-[var(--shadow-soft)]"
          />
          <div className="flex flex-col gap-5">
            <SectionHeading eyebrow={ph.eyebrow} title={ph.subheading} />
            <p className="measure text-lg text-muted-foreground">{ph.lead}</p>
            <p className="measure text-muted-foreground">
              {ph.body}
            </p>
            <div>
              <Button asChild intent="outline">
                <Link href={routes.founder.href}>
                  {ph.cta} <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="sage" spacing="lg">
        <SectionHeading
          eyebrow={ph.eyebrow}
          title={ph.subheading}
          intro={ph.lead}
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { t: ph.item(1), d: ph.body },
            { t: ph.item(2), d: ph.body },
            { t: ph.item(3), d: ph.body },
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
