import { ph } from './placeholder';

/**
 * Brand identity — CONTENT REMOVED.
 *
 * The previous website's wording (brand, tagline, founder biography, press
 * references, etc.) has been removed. These are neutral, development-only
 * placeholders that hold the approved layout only; real client-approved content
 * is supplied later. No wording from the old website is retained.
 */

export interface SocialLink {
  label: string;
  href: string;
  /** lucide icon name or a local key; rendered by the Footer. */
  icon: 'instagram' | 'youtube' | 'linkedin' | 'facebook' | 'spotify';
}

export const site = {
  name: ph.brand,
  brandline: ph.brand,
  tagline: ph.subheading,
  shortDescription: ph.metaDescription,
  belief: ph.subheading,
  ethos: ph.short,

  founder: {
    name: ph.name,
    knownAs: ph.short,
    title: ph.role,
    credentials: [ph.short, ph.short, ph.short],
    shortBio: ph.body,
  },

  contact: {
    email: ph.email,
    location: ph.short,
  },

  socials: [
    { label: 'Instagram', href: '#', icon: 'instagram' },
    { label: 'YouTube', href: '#', icon: 'youtube' },
    { label: 'Spotify', href: '#', icon: 'spotify' },
    { label: 'LinkedIn', href: '#', icon: 'linkedin' },
  ] satisfies SocialLink[],

  /** Neutral placeholders — old press references removed. */
  pressLogos: [ph.item(1), ph.item(2), ph.item(3), ph.item(4)],
} as const;
