import type { Testimonial } from '@/types/content';

/**
 * Testimonials — placeholder content for development only.
 * `isSelfReported` drives the honesty footnote. Real, consented testimonials
 * are client-supplied before the demo (see approval gate).
 */
export const testimonials: Testimonial[] = [
  {
    id: 'test-rachel',
    name: 'Lorem Ipsum',
    role: 'Lorem ipsum dolor',
    quote:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    result: 'Lorem ipsum dolor sit',
    isSelfReported: true,
    image: { alt: 'Placeholder portrait image', tone: 'teal', ratio: '1/1' },
  },
  {
    id: 'test-ebony',
    name: 'Lorem Ipsum',
    role: 'Lorem ipsum dolor',
    quote:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    result: 'Lorem ipsum dolor sit',
    isSelfReported: true,
    image: { alt: 'Placeholder portrait image', tone: 'green', ratio: '1/1' },
  },
  {
    id: 'test-claudine',
    name: 'Lorem Ipsum',
    role: 'Lorem ipsum dolor',
    quote:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    result: 'Lorem ipsum dolor sit',
    isSelfReported: true,
    image: { alt: 'Placeholder portrait image', tone: 'amber', ratio: '1/1' },
  },
  {
    id: 'test-paulette',
    name: 'Lorem Ipsum',
    role: 'Lorem ipsum dolor',
    quote:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    result: 'Lorem ipsum dolor sit',
    conditionTag: 'Lorem ipsum',
    isSelfReported: true,
    image: { alt: 'Placeholder portrait image', tone: 'sage', ratio: '1/1' },
  },
];
