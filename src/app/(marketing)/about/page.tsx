import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { site } from '@/content/site';
import { routes } from '@/config/routes';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { Media } from '@/components/ui/media';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'About',
  description: `The story and mission behind ${site.name} — ${site.tagline}.`,
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title="Why we do this"
        lede={`${site.name} exists to prove a simple idea: ${site.belief.toLowerCase()} When you restore your inner environment, you change your life.`}
      />

      <Section tone="default" spacing="lg">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Media
            image={{ alt: `${site.founder.name}`, tone: 'teal', ratio: '4/5' }}
            className="shadow-[var(--shadow-soft)]"
          />
          <div className="flex flex-col gap-5">
            <SectionHeading eyebrow="The mission" title={site.tagline} />
            <p className="measure text-lg text-muted-foreground">{site.founder.shortBio}</p>
            <p className="measure text-muted-foreground">
              It began with a question a twelve-year-old boy couldn’t answer — why medicine seemed to
              manage his father’s illness rather than restore his health. That question became a
              lifetime’s work, and ultimately the HERNE Protocol.
            </p>
            <div>
              <Button asChild intent="outline">
                <Link href={routes.founder.href}>
                  Meet {site.founder.name} <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="sage" spacing="lg">
        <SectionHeading
          eyebrow="What we believe"
          title="Care first. Act second."
          intro="Our values shape every programme, consultation and conversation."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { t: 'The body is responsive', d: 'Not broken. Given the right inner environment, it restores itself.' },
            { t: 'Science made human', d: 'Grounded in physiology, explained in plain language you can act on.' },
            { t: 'Sustainable, not extreme', d: 'Change that fits your life and lasts — never punishing restriction.' },
          ].map((v) => (
            <div key={v.t} className="rounded-2xl border border-border bg-surface p-6">
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
