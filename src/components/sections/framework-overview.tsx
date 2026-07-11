import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { frameworkPillars } from '@/content/framework';
import { routes } from '@/config/routes';
import { Section } from '@/components/ui/section';
import { SectionHeading } from './section-heading';
import { Reveal } from '@/components/ui/reveal';

/** Compact overview for the Home page. */
export function FrameworkOverview() {
  return (
    <Section tone="sage" spacing="lg">
      <SectionHeading
        eyebrow="Our framework"
        title={<>How the framework works</>}
        intro="This is placeholder text in clear English. It introduces the five pillars of the framework. Final approved wording will be supplied later."
      />
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {frameworkPillars.map((pillar, i) => (
          <Reveal as="li" key={pillar.key} delay={i * 70}>
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-soft)]">
              <span className="font-serif text-4xl text-primary">{pillar.letter}</span>
              <span className="font-serif text-lg text-foreground">{pillar.name}</span>
              <span className="text-sm text-muted-foreground">{pillar.tagline}</span>
            </div>
          </Reveal>
        ))}
      </ol>
      <div className="mt-10">
        <Link
          href={routes.framework.href}
          className="inline-flex items-center gap-2 font-medium text-primary hover:gap-3 transition-all"
        >
          Explore the framework <ArrowRight className="size-4" />
        </Link>
      </div>
    </Section>
  );
}
