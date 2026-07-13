/**
 * Route registry — one source of truth for navigation, footer, and the sitemap.
 *
 * Labels and descriptions are clear, neutral English placeholders until final
 * approved wording is supplied. The routes, hrefs and navigation STRUCTURE
 * (groups, positions) are unchanged.
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
  home: { href: '/', label: 'Home' },
  assistant: { href: '/assistant', label: 'AI receptionist' },
  about: { href: '/about', label: 'About' },
  founder: { href: '/founder', label: 'Founder' },
  programmes: { href: '/programmes', label: 'Programmes' },
  consultations: { href: '/consultations', label: 'Consultations' },
  assessment: { href: '/assessment', label: 'Assessment' },
  selfieScan: { href: '/remote-selfie-scan', label: 'Selfie scan' },
  framework: { href: '/framework', label: 'Framework' },
  podcast: { href: '/podcast', label: 'Podcast' },
  resources: { href: '/resources', label: 'Resources' },
  theBook: { href: '/the-book', label: 'The book' },
  book: { href: '/book', label: 'Book' },
  speaking: { href: '/speaking', label: 'Speaking' },
  testimonials: { href: '/testimonials', label: 'Testimonials' },
  contact: { href: '/contact', label: 'Contact' },
  specialists: { href: '/specialists', label: 'Your Wellbeing Team' },
  login: { href: '/login', label: 'Sign in' },
  register: { href: '/register', label: 'Create account' },
  dashboard: { href: '/dashboard', label: 'Dashboard' },
  admin: { href: '/admin', label: 'Admin' },
  privacy: { href: '/privacy', label: 'Privacy' },
  terms: { href: '/terms', label: 'Terms' },
  cookies: { href: '/cookies', label: 'Cookies' },
  disclaimer: { href: '/disclaimer', label: 'Disclaimer' },
} as const satisfies Record<string, RouteDef>;

/** Primary header navigation — clear English group and item labels. */
export const primaryNav: NavGroup[] = [
  {
    label: 'Services',
    items: [
      { ...routes.programmes, description: 'Structured programmes' },
      { ...routes.consultations, description: 'One-to-one consultations' },
      { ...routes.assessment, description: 'The assessment' },
      { ...routes.selfieScan, description: 'The remote selfie scan' },
    ],
  },
  {
    label: 'About',
    items: [
      { ...routes.framework, description: 'How the framework works' },
      { ...routes.about, description: 'About us' },
      { ...routes.founder, description: 'Meet the founder' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { ...routes.podcast, description: 'The podcast' },
      { ...routes.resources, description: 'Guides and articles' },
      { ...routes.theBook, description: 'The book' },
      { ...routes.speaking, description: 'Speaking and events' },
    ],
  },
];

/** Flat list of the top-level nav destinations (mobile + simple contexts). */
export const flatNav: RouteDef[] = [
  routes.assistant,
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
    label: 'Services',
    items: [routes.programmes, routes.consultations, routes.assessment, routes.selfieScan],
  },
  {
    label: 'About',
    items: [routes.framework, routes.about, routes.founder, routes.testimonials],
  },
  {
    label: 'Resources',
    items: [routes.podcast, routes.resources, routes.theBook, routes.speaking],
  },
  {
    label: 'Company',
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
  routes.assistant,
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
