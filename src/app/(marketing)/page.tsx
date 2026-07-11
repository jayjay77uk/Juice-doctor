import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { testimonials as testimonialsService } from '@/services';
import { specialists as specialistsService } from '@/services/specialists';
import { routes } from '@/config/routes';
import { herneStats } from '@/content/herne';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Hero } from '@/components/sections/hero';
import { PressStrip } from '@/components/sections/press-strip';
import { HowItWorks } from '@/components/sections/how-it-works';
import { HerneOverview } from '@/components/sections/herne-overview';
import { SectionHeading } from '@/components/sections/section-heading';
import { SpecialistCard } from '@/components/sections/specialist-card';
import { StatBand } from '@/components/sections/stat-band';
import { TestimonialsCarousel } from '@/components/sections/testimonials-carousel';
import { CtaSection } from '@/components/sections/cta-section';

export default async function HomePage() {
  const [specialistsResult, testimonialsResult] = await Promise.all([
    specialistsService.catalogue(),
    testimonialsService.featured(3),
  ]);
  const specialists = specialistsResult.ok ? specialistsResult.data.slice(0, 3) : [];
  const testimonials = testimonialsResult.ok ? testimonialsResult.data : [];

  return (
    <>
      <Hero />
      <PressStrip />
      <HowItWorks />

      {/* Specialist AIs */}
      <Section tone="default" spacing="lg">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Your AI wellness team"
            title="Specialist AIs, one per pillar"
            intro="Each specialist AI is a dedicated coach with its own knowledge, memory and personality. Subscribe to the one you need — or let the receptionist match you."
          />
          <Button asChild intent="outline" className="shrink-0">
            <Link href={routes.specialists.href}>
              All specialists <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {specialists.map((specialist) => (
            <SpecialistCard key={specialist.id} specialist={specialist} />
          ))}
        </div>
      </Section>

      <HerneOverview />

      <StatBand
        heading="Results you can feel. Science you can trust."
        stats={herneStats}
        tone="inverse"
      />

      {/* Testimonials */}
      <Section tone="cream" spacing="lg">
        <SectionHeading
          eyebrow="In their words"
          title="Real people. Real change."
          intro="A few of the stories behind the method. Consented, named testimonials are added in the full platform."
        />
        <div className="mt-10">
          <TestimonialsCarousel testimonials={testimonials} />
        </div>
      </Section>

      <CtaSection
        title="Ready to meet your AI wellness team?"
        body="Start with a two-minute chat with our receptionist. It’ll match you with the right specialist — no pressure, no obligation."
        primaryLabel="Get matched now"
        primaryHref={routes.start.href}
        secondaryLabel="Browse specialists"
        secondaryHref={routes.specialists.href}
      />
    </>
  );
}
