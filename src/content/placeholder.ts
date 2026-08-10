/**
 * Controlled placeholder content pending client-supplied copy — in clear English.
 *
 * The approved frontend is used as a VISUAL TEMPLATE. Copy here is simple,
 * neutral English placeholder text (no Lorem ipsum, no invented marketing). It
 * stands in for the final, client-approved wording, which is swapped in later
 * here and in the content modules — the design does not change.
 */

/** Single source of truth so a real-content cutover is a one-file change. */
export const PLACEHOLDER_CONTENT = true;

const PLACEHOLDER =
  'This is placeholder text written in clear English. Final approved wording will be supplied later.';

export const ph = {
  brand: 'Ask Juice Doctor AI',
  eyebrow: 'Overview',
  heading: 'Welcome',
  subheading: 'Clear, simple placeholder text',
  lead: PLACEHOLDER,
  body: `${PLACEHOLDER} It stands in for the final content until approved wording is supplied.`,
  short: 'Details',
  cta: 'Continue',
  name: 'Placeholder Name',
  role: 'Placeholder role',
  price: '—',
  email: 'hello@example.com',
  imageAlt: 'Placeholder image',
  metaTitle: 'Ask Juice Doctor AI',
  metaDescription: 'Ask Juice Doctor AI. Final approved wording will be supplied later.',
  quote: 'This is a placeholder quote in clear English.',
  /** Distinct short label for lists/nav where a unique string reads better. */
  item(n: number): string {
    return `Item ${n}`;
  },
} as const;
