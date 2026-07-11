/**
 * Route registry — one source of truth for navigation, footer, and the sitemap.
 *
 * WORDING REMOVED: nav labels and descriptions are neutral development-only
 * placeholders. The routes, hrefs and navigation STRUCTURE (groups, positions)
 * are unchanged — only the old-website text has been stripped.
 */

export interface RouteDef {
  href: string;
  label: string;
  /** Short description used for nav previews / metadata fallbacks. */
  description?: string;
}

export interface NavGroup {
  label: string;
  items: RouteDef[];
}

export const routes = {
  home: { href: '/', label: 'Prototype' },
  about: { href: '/about', label: 'Lorem 1' },
  founder: { href: '/founder', label: 'Lorem 2' },
  programmes: { href: '/programmes', label: 'Lorem 3' },
  consultations: { href: '/consultations', label: 'Lorem 4' },
  assessment: { href: '/assessment', label: 'Lorem 5' },
  selfieScan: { href: '/remote-selfie-scan', label: 'Lorem 6' },
  framework: { href: '/framework', label: 'Lorem 7' },
  podcast: { href: '/podcast', label: 'Lorem 8' },
  resources: { href: '/resources', label: 'Lorem 9' },
  theBook: { href: '/the-book', label: 'Lorem 10' },
  book: { href: '/book', label: 'Lorem 11' },
  speaking: { href: '/speaking', label: 'Lorem 12' },
  testimonials: { href: '/testimonials', label: 'Lorem 13' },
  contact: { href: '/contact', label: 'Lorem 14' },
  login: { href: '/login', label: 'Log in' },
  register: { href: '/register', label: 'Register' },
  dashboard: { href: '/dashboard', label: 'Dashboard' },
  admin: { href: '/admin', label: 'Admin' },
  privacy: { href: '/privacy', label: 'Lorem 15' },
  terms: { href: '/terms', label: 'Lorem 16' },
  cookies: { href: '/cookies', label: 'Lorem 17' },
  disclaimer: { href: '/disclaimer', label: 'Lorem 18' },
} as const satisfies Record<string, RouteDef>;

const D = 'Lorem ipsum dolor sit amet';

/** Primary header navigation — group labels and descriptions are placeholders. */
export const primaryNav: NavGroup[] = [
  {
    label: 'Lorem ipsum',
    items: [
      { ...routes.programmes, description: D },
      { ...routes.consultations, description: D },
      { ...routes.assessment, description: D },
      { ...routes.selfieScan, description: D },
    ],
  },
  {
    label: 'Lorem ipsum',
    items: [
      { ...routes.framework, description: D },
      { ...routes.about, description: D },
      { ...routes.founder, description: D },
    ],
  },
  {
    label: 'Lorem ipsum',
    items: [
      { ...routes.podcast, description: D },
      { ...routes.resources, description: D },
      { ...routes.theBook, description: D },
      { ...routes.speaking, description: D },
    ],
  },
];

/** Flat list of the top-level nav destinations (mobile + simple contexts). */
export const flatNav: RouteDef[] = [
  routes.programmes,
  routes.framework,
  routes.podcast,
  routes.resources,
  routes.about,
  routes.testimonials,
  routes.contact,
];

export const footerNav: NavGroup[] = [
  {
    label: 'Lorem ipsum',
    items: [routes.programmes, routes.consultations, routes.assessment, routes.selfieScan],
  },
  {
    label: 'Lorem ipsum',
    items: [routes.framework, routes.about, routes.founder, routes.testimonials],
  },
  {
    label: 'Lorem ipsum',
    items: [routes.podcast, routes.resources, routes.theBook, routes.speaking],
  },
  {
    label: 'Lorem ipsum',
    items: [routes.contact, routes.privacy, routes.terms, routes.disclaimer],
  },
];

/** Legal links, shown in the footer utility row. */
export const legalNav: RouteDef[] = [
  routes.privacy,
  routes.terms,
  routes.cookies,
  routes.disclaimer,
];

/** Every public URL, for `sitemap.ts`. Dynamic slugs are appended by the sitemap. */
export const publicRoutes: RouteDef[] = [
  routes.home,
  routes.about,
  routes.founder,
  routes.programmes,
  routes.consultations,
  routes.assessment,
  routes.selfieScan,
  routes.framework,
  routes.podcast,
  routes.resources,
  routes.theBook,
  routes.book,
  routes.speaking,
  routes.testimonials,
  routes.contact,
  routes.privacy,
  routes.terms,
  routes.cookies,
  routes.disclaimer,
];
