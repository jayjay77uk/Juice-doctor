import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { podcast as podcastService } from '@/services';
import { routes } from '@/config/routes';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Badge } from '@/components/ui/badge';
import { ComingSoon } from '@/components/sections/coming-soon';
import { ph } from '@/content/placeholder';

export async function generateStaticParams() {
  const slugs = await podcastService.allSlugs();
  return slugs.map((episode) => ({ episode }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ episode: string }>;
}): Promise<Metadata> {
  const { episode } = await params;
  const result = await podcastService.bySlug(episode);
  if (!result.ok) return createMetadata({ title: ph.metaTitle });
  return createMetadata({
    title: result.data.title,
    description: result.data.summary,
    path: `/podcast/${episode}`,
  });
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ episode: string }>;
}) {
  const { episode } = await params;
  const result = await podcastService.bySlug(episode);
  if (!result.ok) notFound();
  const ep = result.data;

  return (
    <>
      <PageHero eyebrow={`Episode ${ep.number}`} title={ep.title} lede={ep.summary}>
        <div className="flex flex-wrap gap-2">
          {ep.topics.map((topic, i) => (
            <Badge key={i} tone="secondary">
              {topic}
            </Badge>
          ))}
        </div>
      </PageHero>
      <Section tone="default" spacing="lg" containerSize="narrow">
        <ComingSoon title={ph.short} body={ph.body} />
        <div className="mt-8">
          <Link
            href={routes.podcast.href}
            className="inline-flex items-center gap-2 font-medium text-primary hover:gap-3 transition-all"
          >
            <ArrowLeft className="size-4" /> {ph.cta}
          </Link>
        </div>
      </Section>
    </>
  );
}
