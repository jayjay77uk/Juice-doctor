import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Programme } from '@/types/content';
import { ok, err, type Result, type Page } from './result';
const ORG = '00000000-0000-0000-0000-000000000001';
function map(row: Record<string, unknown>): Programme {
  const formats: Record<string, Programme['format']> = {
    one_to_one: '1:1',
    group: 'group',
    corporate: 'corporate',
    self_paced: 'self-paced',
  };
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: String(row.summary ?? ''),
    description: String(row.description ?? ''),
    durationLabel: String(row.duration_label ?? ''),
    priceLabel: String(row.price_label || 'Contact the team'),
    format: formats[String(row.format)] ?? 'self-paced',
    includes: Array.isArray(row.includes) ? row.includes : [],
    pillars: [],
    featured: row.featured === true,
    image: { alt: String(row.title), tone: 'teal' },
  };
}
function query() {
  return createAdminClient()
    ?.from('programmes')
    .select('*')
    .eq('organisation_id', ORG)
    .eq('publish_status', 'published');
}
export const programmeCatalogue = {
  async list(q: { limit?: number; cursor?: string } = {}): Promise<Result<Page<Programme>>> {
    const source = query();
    if (!source)
      return err({ code: 'unavailable', message: 'Programme catalogue is unavailable.' });
    const limit = Math.max(1, Math.min(q.limit ?? 100, 100));
    const start = Math.max(0, Number.parseInt(q.cursor ?? '0', 10) || 0);
    const result = await source
      .order('sort_order')
      .order('id')
      .range(start, start + limit);
    if (result.error)
      return err({ code: 'unavailable', message: 'Programme catalogue could not be loaded.' });
    return ok({
      items: result.data.slice(0, limit).map(map),
      nextCursor: result.data.length > limit ? String(start + limit) : null,
    });
  },
  async featured(): Promise<Result<Programme[]>> {
    const source = query();
    if (!source)
      return err({ code: 'unavailable', message: 'Programme catalogue is unavailable.' });
    const result = await source.eq('featured', true).order('sort_order').limit(6);
    return result.error
      ? err({ code: 'unavailable', message: 'Programme catalogue could not be loaded.' })
      : ok(result.data.map(map));
  },
  async bySlug(slug: string): Promise<Result<Programme>> {
    const source = query();
    if (!source)
      return err({ code: 'unavailable', message: 'Programme catalogue is unavailable.' });
    const result = await source.eq('slug', slug).maybeSingle();
    return result.data
      ? ok(map(result.data))
      : err({ code: 'not_found', message: 'Programme not found.' });
  },
  async allSlugs(): Promise<string[]> {
    const slugs: string[] = [];
    let cursor: string | null = null;
    do {
      const result = await programmeCatalogue.list(cursor ? { cursor } : {});
      if (!result.ok) return slugs;
      slugs.push(...result.data.items.map((p) => p.slug));
      cursor = result.data.nextCursor;
    } while (cursor);
    return slugs;
  },
};
