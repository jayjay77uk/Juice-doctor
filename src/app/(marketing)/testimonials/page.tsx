import type { Metadata } from 'next';
import { Quote } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { ph } from '@/content/placeholder';
import { testimonials as testimonialsService } from '@/services';
import { frameworkStats } from '@/content/framework';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { StatBand } from '@/components/sections/stat-band';
import { Media } from '@/components/ui/media';
import { Reveal } from '@/components/ui/reveal';
import { CtaSection } from '@/components/sections/cta-section';

export const metadata: Metadata = createMetadata({
  title: 'Testimonials',
  description: ph.metaDescription,
  path: '/testimonials',
});

export default async function TestimonialsPage() {
  const result = await testimonialsService.list();
  const testimonials = result.ok ? result.data.items : [];

  return (
    <>
      <PageHero
        eyebrow="Testimonials"
        title="What people say"
        lede="This is placeholder text in clear English. Final approved client stories will be supplied later."
      />

      <Section tone="default" spacing="lg">
        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={i * 70}>
              <figure className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-surface p-7">
                <Quote className="size-8 text-accent" aria-hidden />
                <blockquote className="flex-1 font-serif text-xl leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>
                {t.result && (
                  <p className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-sm text-secondary">
                    {t.result}
                  </p>
                )}
                <figcaption className="flex items-center gap-3 border-t border-border pt-4">
                  {t.image && <Media image={t.image} className="size-12 shrink-0" />}
                  <div>
                    <p className="font-medium text-foreground">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.role}
                      {t.conditionTag ? ` · ${t.conditionTag}` : ''}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Testimonials shown are illustrative placeholders pending client-supplied copy.
          Consented, named client stories will replace them.
        </p>
      </Section>

      <StatBand stats={frameworkStats} tone="inverse" />
      <CtaSection />
    </>
  );
}
