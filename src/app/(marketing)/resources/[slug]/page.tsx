import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { resources as resourcesService } from '@/services';
import { routes } from '@/config/routes';
import { ph } from '@/content/placeholder';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { Media } from '@/components/ui/media';

export async function generateStaticParams() {
  const slugs = await resourcesService.allSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await resourcesService.bySlug(slug);
  if (!result.ok) return createMetadata({ title: ph.metaTitle });
  return createMetadata({
    title: result.data.title,
    description: result.data.excerpt,
    path: `/resources/${slug}`,
  });
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await resourcesService.bySlug(slug);
  if (!result.ok) notFound();
  const resource = result.data;

  return (
    <>
      <PageHero eyebrow={resource.readingTimeLabel} title={resource.title} lede={resource.excerpt} />
      <Section tone="default" spacing="lg" containerSize="narrow">
        <Media image={resource.image} className="mb-10" priority sizes="(max-width:768px) 100vw, 640px" />
        {/* Long-form article body is Phase-2 content. This is the reading template. */}
        <article className="measure mx-auto flex flex-col gap-5 text-lg leading-relaxed text-foreground/90">
          <p>{resource.body ?? ph.body}</p>
          <p className="text-muted-foreground">{ph.body}</p>
          <blockquote className="border-l-4 border-secondary pl-5 font-serif text-2xl text-foreground">
            {ph.quote}
          </blockquote>
        </article>
        <div className="mt-12">
          <Link
            href={routes.resources.href}
            className="inline-flex items-center gap-2 font-medium text-primary hover:gap-3 transition-all"
          >
            <ArrowLeft className="size-4" /> {ph.cta}
          </Link>
        </div>
      </Section>
    </>
  );
}
