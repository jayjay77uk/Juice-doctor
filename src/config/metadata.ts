import type { Metadata } from 'next';
import { site } from '@/content/site';

/**
 * SEO defaults. Per-route pages extend these via `createMetadata()`.
 * The prototype sets `robots: noindex` globally (see `app/robots.ts`) — access
 * is guarded by Vercel Deployment Protection, not by SEO directives.
 */
// Neutral placeholder host — old-business domain removed.
export const SITE_URL = 'https://prototype.example.com';

// Honest, non-placeholder title for the browser tab + share cards. Final approved
// marketing wording is client-supplied; this is a factual product descriptor.
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
  // Prototype: keep the whole environment out of search indexes.
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
