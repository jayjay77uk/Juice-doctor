/**
 * Brand identity — the founder's name, mission, and contact details.
 *
 * IMPORTANT: the founder's name lives here and ONLY here (sourced everywhere via
 * this module). The current live site renders "Edward Warden" in its footer by
 * mistake — the correct name is "Erran Warden". Centralising it structurally
 * prevents that class of bug from recurring.
 */

export interface SocialLink {
  label: string;
  href: string;
  /** lucide icon name or a local key; rendered by the Footer. */
  icon: 'instagram' | 'youtube' | 'linkedin' | 'facebook' | 'spotify';
}

export const site = {
  name: 'Ask Juice Doctor',
  brandline: 'Ask Juice Doctor AI',
  tagline: 'Transform Your Wellbeing From the Inside Out',
  shortDescription:
    'Your AI wellness team — an AI receptionist matches you with specialist AI coaches, guided by the HERNE Protocol, with a human expert on hand.',
  belief: 'The body is not broken. It is responsive.',
  ethos: 'Care first. Act second.',

  founder: {
    name: 'Erran Warden',
    knownAs: 'The Juice Doctor',
    title: 'Clinical Nutritionist & Regenerative Health Specialist',
    // Credentials shown publicly — CONFIRM with client before production
    // (approval-gate item: which qualifications/registrations may be stated).
    credentials: [
      'Clinical Nutritionist',
      'Regenerative Health Specialist',
      'Natural Health Researcher',
    ],
    shortBio:
      'Erran Warden — known to millions as The Juice Doctor — has spent his life asking one question: why does conventional medicine so often manage symptoms rather than restore health? His answer became the HERNE Protocol.',
  },

  contact: {
    email: 'hello@askjuicedoctor.com',
    location: 'United Kingdom',
    // No phone published in the prototype.
  },

  socials: [
    { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' },
    { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' },
    { label: 'Spotify', href: 'https://spotify.com', icon: 'spotify' },
    { label: 'LinkedIn', href: 'https://linkedin.com', icon: 'linkedin' },
  ] satisfies SocialLink[],

  /** Media the brand has appeared in. CONFIRM verifiable outlets with client. */
  pressLogos: ['Channel 4', 'Sky', 'Best You Expo', 'HMPTV'],
} as const;
