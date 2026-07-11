/**
 * Route registry — one source of truth for navigation, footer, and the sitemap.
 *
 * Adding a page here wires it into the header nav, footer, and `sitemap.ts`
 * with no drift. Grouped to mirror the App Router route groups.
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
  about: { href: '/about', label: 'About' },
  founder: { href: '/founder', label: 'Erran Warden' },
  programmes: { href: '/programmes', label: 'Programmes' },
  consultations: { href: '/consultations', label: 'Consultations' },
  bodyMot: { href: '/body-mot', label: 'Body MOT' },
  selfieScan: { href: '/remote-selfie-scan', label: 'Remote Selfie Scan' },
  herne: { href: '/herne-protocol', label: 'HERNE Protocol' },
  podcast: { href: '/podcast', label: 'Podcast' },
  resources: { href: '/resources', label: 'Resources' },
  theBook: { href: '/the-book', label: 'The Book' },
  book: { href: '/book', label: 'Book a session' },
  speaking: { href: '/speaking', label: 'Speaking' },
  testimonials: { href: '/testimonials', label: 'Testimonials' },
  contact: { href: '/contact', label: 'Contact' },
  login: { href: '/login', label: 'Log in' },
  register: { href: '/register', label: 'Register' },
  dashboard: { href: '/dashboard', label: 'Dashboard' },
  admin: { href: '/admin', label: 'Admin' },
  privacy: { href: '/privacy', label: 'Privacy' },
  terms: { href: '/terms', label: 'Terms' },
  cookies: { href: '/cookies', label: 'Cookies' },
  disclaimer: { href: '/disclaimer', label: 'Medical Disclaimer' },
} as const satisfies Record<string, RouteDef>;

/** Primary header navigation, organised into mega-menu groups. */
export const primaryNav: NavGroup[] = [
  {
    label: 'Work with Erran',
    items: [
      { ...routes.programmes, description: 'HERNE-led coaching programmes' },
      { ...routes.consultations, description: 'One-to-one and group sessions' },
      { ...routes.bodyMot, description: 'Your full-body health assessment' },
      { ...routes.selfieScan, description: 'An at-home wellbeing scan' },
    ],
  },
  {
    label: 'The Method',
    items: [
      { ...routes.herne, description: 'The five pillars of restoration' },
      { ...routes.about, description: 'The story and the mission' },
      { ...routes.founder, description: 'Meet the Juice Doctor' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { ...routes.podcast, description: 'Real conversations on natural health' },
      { ...routes.resources, description: 'Articles, guides and recipes' },
      { ...routes.theBook, description: 'The Irrefutable Power of Water' },
      { ...routes.speaking, description: 'Keynotes and events' },
    ],
  },
];

/** Flat list of the top-level nav destinations (mobile + simple contexts). */
export const flatNav: RouteDef[] = [
  routes.programmes,
  routes.herne,
  routes.podcast,
  routes.resources,
  routes.about,
  routes.testimonials,
  routes.contact,
];

export const footerNav: NavGroup[] = [
  {
    label: 'Programmes',
    items: [routes.programmes, routes.consultations, routes.bodyMot, routes.selfieScan],
  },
  {
    label: 'The Method',
    items: [routes.herne, routes.about, routes.founder, routes.testimonials],
  },
  {
    label: 'Learn',
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
  routes.about,
  routes.founder,
  routes.programmes,
  routes.consultations,
  routes.bodyMot,
  routes.selfieScan,
  routes.herne,
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
