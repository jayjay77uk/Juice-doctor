import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/metadata';
import { config } from '@/config/app';

/**
 * Prototype: disallow all crawling. NOTE: this is a courtesy signal, not the
 * access guard — the admin and member areas are protected by authentication
 * (middleware + requireRole). Production flips to allow indexing.
 */
export default function robots(): MetadataRoute.Robots {
  if (config.isPrototype) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
