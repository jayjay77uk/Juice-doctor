import type { MetadataRoute } from 'next';

/**
 * Search indexing is intentionally OFF until the client approves the public
 * launch (final marketing copy + production domain). This is a courtesy signal,
 * not the access guard — the admin and member areas are protected by
 * authentication (middleware + requireRole). Flip to allow + sitemap at launch.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
