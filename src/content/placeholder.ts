/**
 * Controlled, DEVELOPMENT-ONLY placeholder content.
 *
 * The approved frontend is used as a VISUAL TEMPLATE only. All previous website
 * wording has been removed; it is NOT replaced with real or invented marketing
 * copy. These neutral placeholders exist purely to hold the approved layout,
 * spacing and component structure. They are public-safe (no internal
 * "[Approved … required]" labels are exposed to users) and are obviously
 * temporary (lorem ipsum). Real, client-approved copy is supplied later and
 * swapped in here and in the content modules — the design does not change.
 */

/** Single source of truth so a real-content cutover is a one-file change. */
export const PROTOTYPE_CONTENT = true;

const L = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

export const ph = {
  brand: 'Prototype',
  eyebrow: 'Lorem ipsum',
  heading: 'Lorem ipsum dolor sit amet',
  subheading: 'Lorem ipsum dolor sit amet consectetur',
  lead: `${L} Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
  body: `${L} Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.`,
  short: 'Lorem ipsum',
  cta: 'Lorem ipsum',
  name: 'Lorem Ipsum',
  role: 'Lorem ipsum dolor',
  price: '—',
  email: 'hello@example.com',
  imageAlt: 'Placeholder image',
  metaTitle: 'Prototype',
  metaDescription: L,
  quote: `${L} Sed do eiusmod tempor incididunt ut labore.`,
  /** Distinct short label for lists/nav where a unique string reads better. */
  item(n: number): string {
    return `Lorem ${n}`;
  },
} as const;
