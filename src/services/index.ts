import 'server-only';

import type {
  Consultation,
  PodcastEpisode,
  Programme,
  Resource,
  Testimonial,
} from '@/types/content';
import { programmes as programmeData, consultations as consultationData } from '@/content/programmes';
import { testimonials as testimonialData } from '@/content/testimonials';
import { podcastEpisodes as podcastData } from '@/content/podcast';
import { resources as resourceData } from '@/content/resources';
import { ok, err, type Page, type Result } from './result';

/**
 * Read service — the ONLY layer that knows where data comes from.
 *
 * Prototype: every getter reads typed constants from `src/content/*`.
 * Production (Phase 2): a `*.supabase.ts` provider is added per domain and
 * selected here off the non-public `APP_MODE` env — components never change,
 * because they already consume the async, paginated, error-typed shapes below.
 *
 * The interface intentionally carries pagination + a `Result` error union now,
 * even though the mock always succeeds, so nothing is retrofitted later.
 */

const APP_MODE = process.env.APP_MODE ?? 'prototype';
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
export const programmes = {
  async list(q: ListQuery = {}): Promise<Result<Page<Programme>>> {
    return ok(paginate(programmeData, q.limit, q.cursor));
  },
  async featured(): Promise<Result<Programme[]>> {
    return ok(programmeData.filter((p) => p.featured));
  },
  async bySlug(slug: string): Promise<Result<Programme>> {
    const match = programmeData.find((p) => p.slug === slug);
    return match ? ok(match) : err({ code: 'not_found', message: 'Programme not found.' });
  },
  async allSlugs(): Promise<string[]> {
    return programmeData.map((p) => p.slug);
  },
};

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
