import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { programmes as programmesService, testimonials as testimonialsService } from '@/services';
import { routes } from '@/config/routes';
import { frameworkStats } from '@/content/framework';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Hero } from '@/components/sections/hero';
import { PressStrip } from '@/components/sections/press-strip';
import { FrameworkOverview } from '@/components/sections/framework-overview';
import { SectionHeading } from '@/components/sections/section-heading';
import { ProgrammeCard } from '@/components/sections/programme-card';
import { StatBand } from '@/components/sections/stat-band';
import { TestimonialsCarousel } from '@/components/sections/testimonials-carousel';
import { CtaSection } from '@/components/sections/cta-section';
import { SpecialistsHomeSection } from '@/components/specialists/home-section';

export default async function HomePage() {
  const [programmesResult, testimonialsResult] = await Promise.all([
    programmesService.featured(),
    testimonialsService.featured(3),
  ]);
  const programmes = programmesResult.ok ? programmesResult.data : [];
  const testimonials = testimonialsResult.ok ? testimonialsResult.data : [];

  return (
    <>
      <Hero />
      <PressStrip />
      <SpecialistsHomeSection />
      <FrameworkOverview />

      {/* Programmes */}
      <Section tone="default" spacing="lg">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Programmes"
            title="Featured programmes"
            intro="This is placeholder text in clear English. Final approved wording will be supplied later."
          />
          <Button asChild intent="outline" className="shrink-0">
            <Link href={routes.programmes.href}>
              View all programmes <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programmes.map((programme) => (
            <ProgrammeCard key={programme.id} programme={programme} />
          ))}
        </div>
      </Section>

      <StatBand
        heading="By the numbers"
        stats={frameworkStats}
        tone="inverse"
      />

      {/* Testimonials */}
      <Section tone="cream" spacing="lg">
        <SectionHeading
          eyebrow="Testimonials"
          title="What people say"
          intro="This is placeholder text in clear English. Final approved wording will be supplied later."
        />
        <div className="mt-10">
          <TestimonialsCarousel testimonials={testimonials} />
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
