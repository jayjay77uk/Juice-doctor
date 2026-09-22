import 'server-only';

import type { Consultation, PodcastEpisode, Resource, Testimonial } from '@/types/content';
import { consultations as consultationData } from '@/content/programmes';
import { programmeCatalogue } from './programme-catalogue';
import { testimonials as testimonialData } from '@/content/testimonials';
import { podcastEpisodes as podcastData } from '@/content/podcast';
import { resources as resourceData } from '@/content/resources';
import { ok, err, type Page, type Result } from './result';

/**
 * Marketing-content read service (programmes, consultations copy, testimonials,
 * podcast, resources). These getters deliberately read neutral placeholder
 * constants from `src/content/*` pending client-supplied branding/content;
 * operational data (CRM, conversations, knowledge, subscriptions, …) lives in
 * the Supabase-backed services and repositories instead.
 *
 * A `*.supabase.ts` provider per domain can later be selected here off the
 * non-public `APP_MODE` env — components never change, because they already
 * consume the async, paginated, error-typed shapes below.
 */

const APP_MODE = process.env.APP_MODE ?? 'standard';
// Reserved seam: when `APP_MODE === 'production'`, swap in Supabase providers.
export const isProductionData = APP_MODE === 'production';

function paginate<T>(items: T[], limit?: number, cursor?: string): Page<T> {
  const start = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const end = limit ? start + limit : items.length;
  const slice = items.slice(start, end);
  const nextCursor = end < items.length ? String(end) : null;
  return { items: slice, nextCursor };
}

export interface ListQuery {
  limit?: number;
  cursor?: string;
}

/* ── Programmes ──────────────────────────────────────────────────────────── */
export const programmes = programmeCatalogue;

/* ── Consultations ───────────────────────────────────────────────────────── */
export const consultations = {
  async list(): Promise<Result<Consultation[]>> {
    return ok(consultationData);
  },
};

/* ── Testimonials ────────────────────────────────────────────────────────── */
export const testimonials = {
  async list(q: ListQuery = {}): Promise<Result<Page<Testimonial>>> {
    return ok(paginate(testimonialData, q.limit, q.cursor));
  },
  async featured(count = 3): Promise<Result<Testimonial[]>> {
    return ok(testimonialData.slice(0, count));
  },
};

/* ── Podcast ─────────────────────────────────────────────────────────────── */
export const podcast = {
  async list(q: ListQuery = {}): Promise<Result<Page<PodcastEpisode>>> {
    return ok(paginate(podcastData, q.limit, q.cursor));
  },
  async bySlug(slug: string): Promise<Result<PodcastEpisode>> {
    const match = podcastData.find((e) => e.slug === slug);
    return match ? ok(match) : err({ code: 'not_found', message: 'Episode not found.' });
  },
  async allSlugs(): Promise<string[]> {
    return podcastData.map((e) => e.slug);
  },
};

/* ── Resources ───────────────────────────────────────────────────────────── */
export const resources = {
  async list(q: ListQuery = {}): Promise<Result<Page<Resource>>> {
    return ok(paginate(resourceData, q.limit, q.cursor));
  },
  async bySlug(slug: string): Promise<Result<Resource>> {
    const match = resourceData.find((r) => r.slug === slug);
    return match ? ok(match) : err({ code: 'not_found', message: 'Resource not found.' });
  },
  async allSlugs(): Promise<string[]> {
    return resourceData.map((r) => r.slug);
  },
};
