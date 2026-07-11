import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { ph } from '@/content/placeholder';
import { programmes as programmesService, consultations as consultationsService } from '@/services';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { BookingFlow, type BookingService } from '@/components/sections/booking-flow';

export const metadata: Metadata = createMetadata({
  title: ph.metaTitle,
  description: ph.metaDescription,
  path: '/book',
});

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const [progResult, consResult] = await Promise.all([
    programmesService.list(),
    consultationsService.list(),
  ]);

  const services: BookingService[] = [
    { slug: 'consultation-1', title: ph.short, priceLabel: ph.price },
    { slug: 'body-mot', title: ph.short, priceLabel: ph.price },
    ...(consResult.ok
      ? consResult.data.map((c) => ({ slug: c.slug, title: c.title, priceLabel: c.priceLabel }))
      : []),
    ...(progResult.ok
      ? progResult.data.items.map((p) => ({ slug: p.slug, title: p.title, priceLabel: p.priceLabel }))
      : []),
  ].filter(
    (svc, index, all) => all.findIndex((other) => other.slug === svc.slug) === index,
  );

  return (
    <>
      <PageHero
        eyebrow={ph.eyebrow}
        title={ph.heading}
        lede={ph.lead}
      />
      <Section tone="default" spacing="lg" containerSize="narrow">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <BookingFlow services={services} {...(service ? { initialService: service } : {})} />
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:h-fit">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-serif text-lg text-foreground">{ph.subheading}</h2>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
                {[ph.item(1), ph.item(2), ph.item(3)].map(
                  (item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <p className="rounded-xl bg-surface-muted px-5 py-4 text-xs text-muted-foreground">
              Prototype — this flow is fully clickable but no appointment is actually reserved and no
              details are stored.
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
