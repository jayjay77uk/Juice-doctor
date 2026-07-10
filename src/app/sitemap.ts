import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/metadata';
import { publicRoutes } from '@/config/routes';
import { programmes, podcast, resources } from '@/services';

/**
 * Generated from the route registry plus dynamic slugs from the service layer —
 * so it works identically for mock (prototype) and Supabase (production) data.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [programmeSlugs, episodeSlugs, resourceSlugs] = await Promise.all([
    programmes.allSlugs(),
    podcast.allSlugs(),
    resources.allSlugs(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${SITE_URL}${route.href === '/' ? '' : route.href}`,
    changeFrequency: 'monthly',
    priority: route.href === '/' ? 1 : 0.7,
  }));

  const dynamicEntries: MetadataRoute.Sitemap = [
    ...programmeSlugs.map((slug) => ({ url: `${SITE_URL}/programmes/${slug}`, priority: 0.6 })),
    ...episodeSlugs.map((slug) => ({ url: `${SITE_URL}/podcast/${slug}`, priority: 0.5 })),
    ...resourceSlugs.map((slug) => ({ url: `${SITE_URL}/resources/${slug}`, priority: 0.5 })),
  ];

  return [...staticEntries, ...dynamicEntries];
}
