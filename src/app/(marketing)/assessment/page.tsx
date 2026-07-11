import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { assessment } from '@/content/features';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { FeatureGrid } from '@/components/sections/feature-grid';
import { Media } from '@/components/ui/media';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { Reveal } from '@/components/ui/reveal';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Assessment',
  description:
    'This is placeholder text written in clear English. Final approved wording will be supplied later.',
  path: '/assessment',
});

export default function AssessmentPage() {
  return (
    <>
      <PageHero eyebrow={assessment.eyebrow} title={assessment.title} lede={assessment.lede}>
        <Button asChild size="lg">
          <Link href="/book?service=assessment">
            Book an assessment <ArrowRight className="size-4" />
          </Link>
        </Button>
      </PageHero>

      <Section tone="default" spacing="lg">
        <SectionHeading eyebrow="Overview" title="What the assessment includes" />
        <div className="mt-10">
          <FeatureGrid items={assessment.what} />
        </div>
      </Section>

      <Section tone="sage" spacing="lg">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Process" title="How it works" />
            <ol className="mt-8 flex flex-col gap-6">
              {assessment.steps.map((step, i) => (
                <Reveal as="li" key={i} delay={i * 80}>
                  <div className="flex gap-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-serif text-primary-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-serif text-lg text-foreground">{step.title}</h3>
                      <p className="mt-1 text-muted-foreground">{step.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
          <Media
            image={{ alt: 'Placeholder image', tone: 'teal', ratio: '4/3' }}
            className="shadow-[var(--shadow-soft)]"
            overlay
          >
            <div className="mt-auto p-6 text-cream-50">
              <p className="text-sm uppercase tracking-[0.16em] text-cream-200">Details</p>
              <p className="font-serif text-2xl">Clear, simple placeholder text</p>
            </div>
          </Media>
        </div>
      </Section>

      <Section tone="default" spacing="lg" containerSize="narrow">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Price</p>
          <p className="mt-3 font-serif text-4xl text-foreground">Price on request</p>
          <p className="mt-2 text-muted-foreground">This is placeholder text written in clear English. Final approved wording will be supplied later.</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/book?service=assessment">Book an assessment</Link>
          </Button>
        </div>
        <div className="mt-12">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <div className="mt-6">
            <Accordion items={assessment.faqs} />
          </div>
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
