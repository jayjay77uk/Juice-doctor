import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { ph } from '@/content/placeholder';
import { programmes as programmesService } from '@/services';
import { hernePillars } from '@/content/herne';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Media } from '@/components/ui/media';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CtaSection } from '@/components/sections/cta-section';

export async function generateStaticParams() {
  const slugs = await programmesService.allSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await programmesService.bySlug(slug);
  if (!result.ok) return createMetadata({ title: ph.metaTitle });
  return createMetadata({
    title: result.data.title,
    description: result.data.summary,
    path: `/programmes/${slug}`,
  });
}

export default async function ProgrammeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await programmesService.bySlug(slug);
  if (!result.ok) notFound();
  const programme = result.data;
  const pillars = hernePillars.filter((p) => programme.pillars.includes(p.key));

  return (
    <>
      <PageHero eyebrow={ph.eyebrow} title={programme.title} lede={programme.summary}>
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{programme.durationLabel}</Badge>
          <Badge tone="secondary">{programme.priceLabel}</Badge>
        </div>
      </PageHero>

      <Section tone="default" spacing="lg">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-h2">{ph.heading}</h2>
              <p className="measure mt-4 text-lg text-muted-foreground">{programme.description}</p>
            </div>
            <div>
              <h3 className="text-h3">{ph.subheading}</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {programme.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-1 size-4 shrink-0 text-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {pillars.length > 0 && (
              <div>
                <h3 className="text-h3">{ph.subheading}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {pillars.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-4 py-2 text-sm text-foreground"
                    >
                      <span className="font-serif text-primary">{p.letter}</span> {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:h-fit">
            <Media image={programme.image} className="mb-5" />
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="font-serif text-3xl text-foreground">{programme.priceLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">{programme.durationLabel}</p>
              <Button asChild size="lg" full className="mt-5">
                <Link href={`/book?service=${programme.slug}`}>
                  {ph.cta} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild intent="ghost" full className="mt-2">
                <Link href="/book?service=consultation-1">{ph.cta}</Link>
              </Button>
            </div>
          </aside>
        </div>
      </Section>

      <CtaSection />
    </>
  );
}
