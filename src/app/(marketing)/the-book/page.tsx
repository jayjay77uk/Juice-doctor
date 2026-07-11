import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Media } from '@/components/ui/media';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/sections/coming-soon';
import { ph } from '@/content/placeholder';

export const metadata: Metadata = createMetadata({
  title: ph.metaTitle,
  description: ph.metaDescription,
  path: '/the-book',
});

const chapters = [ph.item(1), ph.item(2), ph.item(3), ph.item(4)];

export default function TheBookPage() {
  return (
    <>
      <PageHero eyebrow={ph.eyebrow} title={ph.heading} lede={ph.lead} />
      <Section tone="default" spacing="lg">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="mx-auto w-full max-w-sm">
            <Media
              image={{ alt: ph.imageAlt, tone: 'teal', ratio: '3/4' }}
              className="shadow-[var(--shadow-soft-lg)]"
              priority
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-4xl text-foreground">{ph.price}</span>
              <span className="text-sm text-muted-foreground">{ph.short}</span>
            </div>
            <p className="measure text-lg text-muted-foreground">{ph.body}</p>
            <div>
              <h2 className="text-h3">{ph.subheading}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {chapters.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-1 size-4 shrink-0 text-secondary" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <ComingSoon
              title="Checkout coming in the full platform"
              body="In production, you’ll be able to buy the book securely here with signed-copy and digital options. Payments are not connected in this prototype."
              className="mt-2 text-left"
            />
            <Button size="lg" disabled className="w-fit">
              {ph.cta}
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
