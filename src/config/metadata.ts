import type { Metadata } from 'next';
import { site } from '@/content/site';

/**
 * SEO defaults. Per-route pages extend these via `createMetadata()`.
 * Indexing stays off until the client approves public launch (see `app/robots.ts`).
 */
// The deployed origin — domain-agnostic. The client's final domain is a
// single env change (NEXT_PUBLIC_SITE_URL); until then Vercel's production
// URL applies automatically. Canonical/OG URLs, sitemaps and auth redirects
// all derive from this.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  'http://localhost:3011';

const TITLE_DEFAULT = `${site.name} — Wellbeing Specialist Platform`;

export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: `%s · ${site.name}`,
  },
  description: site.shortDescription,
  applicationName: site.brandline,
  authors: [{ name: site.founder.name }],
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: TITLE_DEFAULT,
    description: site.shortDescription,
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: site.shortDescription,
  },
  // Indexing off until the client approves public launch (final copy + domain).
  robots: { index: false, follow: false },
};

/** Helper for per-page metadata that keeps titles and descriptions consistent. */
export function createMetadata(input: {
  title: string;
  description?: string;
  path?: string;
}): Metadata {
  const description = input.description ?? site.shortDescription;
  return {
    title: input.title,
    description,
    openGraph: {
      title: `${input.title} · ${site.name}`,
      description,
      ...(input.path ? { url: input.path } : {}),
    },
    twitter: { title: `${input.title} · ${site.name}`, description },
  };
}
