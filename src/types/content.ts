/**
 * Content model — the single source of truth for the shapes the UI consumes.
 *
 * These types are DERIVED FROM the database schema (`db/migrations/*`, applied
 * to the live Supabase project).
 * Marketing content is currently satisfied by typed placeholder content in
 * `src/content/*` (pending client-supplied copy); operational data is served
 * from the live database by Supabase-backed services returning the same shapes.
 * Components depend on these types, never on where the data came from.
 */

/** Brand tone used to grade placeholder imagery in the prototype. */
export type BrandTone = 'teal' | 'green' | 'amber' | 'sage' | 'ink';

/**
 * A reference to an image. In the prototype, `src` is usually omitted and a
 * graded placeholder is rendered from `tone`. In production, `src` is a
 * Supabase Storage path. `alt` is always required (accessibility).
 */
export interface ImageRef {
  alt: string;
  src?: string;
  tone?: BrandTone;
  /** Optional aspect ratio hint, e.g. "3/2", "4/5", "16/9". */
  ratio?: string;
}

export type ProgrammeFormat = '1:1' | 'group' | 'corporate' | 'self-paced';

/** The five pillars of the framework. */
export type PillarKey = 'pillar-one' | 'pillar-two' | 'pillar-three' | 'pillar-four' | 'pillar-five';

export interface Pillar {
  key: PillarKey;
  /** The single letter shown in the framework device. */
  letter: string;
  name: string;
  tagline: string;
  description: string;
  points: string[];
  tone: BrandTone;
}

export interface Programme {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  durationLabel: string;
  format: ProgrammeFormat;
  priceLabel: string;
  includes: string[];
  pillars: PillarKey[];
  featured: boolean;
  image: ImageRef;
}

export interface Consultation {
  id: string;
  slug: string;
  title: string;
  summary: string;
  durationLabel: string;
  priceLabel: string;
  forWhom: string;
  includes: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  /** Whether the outcome is self-reported (drives the honesty footnote). */
  isSelfReported: boolean;
  result?: string;
  conditionTag?: string;
  image?: ImageRef;
}

export interface PodcastEpisode {
  id: string;
  slug: string;
  number: number;
  title: string;
  summary: string;
  durationLabel: string;
  publishedLabel: string;
  topics: string[];
  /** Null in the prototype — no media is hosted. */
  audioUrl: string | null;
}

export type ResourceCategory = 'article' | 'guide' | 'recipe' | 'video';

export interface Resource {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: ResourceCategory;
  readingTimeLabel: string;
  publishedLabel: string;
  image: ImageRef;
  /** Long-form body is Phase-2 content; optional in the prototype. */
  body?: string;
}

export interface Stat {
  value: string;
  label: string;
  /** e.g. "self-reported" — surfaced as an honesty footnote. */
  note?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Marketing content for one signature-feature page (assessment, selfie scan). */
export interface SignatureFeature {
  slug: string;
  eyebrow: string;
  title: string;
  lede: string;
  what: { title: string; body: string; icon?: string }[];
  steps: { title: string; body: string }[];
  faqs: FaqItem[];
}
