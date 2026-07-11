import type { Testimonial } from '@/types/content';

/**
 * Testimonials — placeholder content for development only.
 * `isSelfReported` drives the honesty footnote. Real, consented testimonials
 * are client-supplied before the demo (see approval gate).
 */
export const testimonials: Testimonial[] = [
  {
    id: 'test-rachel',
    name: 'Customer A',
    role: 'Programme participant',
    quote:
      'The programme was easy to follow and the daily support kept me on track. I noticed a real difference in how I felt within the first few weeks.',
    result: 'Felt more energetic day to day',
    isSelfReported: true,
    image: { alt: 'Placeholder portrait image', tone: 'teal', ratio: '1/1' },
  },
  {
    id: 'test-ebony',
    name: 'Customer B',
    role: 'Programme participant',
    quote:
      'I appreciated how clear and practical the guidance was. Everything was explained in plain language, which made it simple to stick with.',
    result: 'Built a routine I can maintain',
    isSelfReported: true,
    image: { alt: 'Placeholder portrait image', tone: 'green', ratio: '1/1' },
  },
  {
    id: 'test-claudine',
    name: 'Customer C',
    role: 'Programme participant',
    quote:
      'The support felt personal and encouraging from start to finish. I always knew what to do next and never felt left on my own.',
    result: 'Stayed consistent for the full term',
    isSelfReported: true,
    image: { alt: 'Placeholder portrait image', tone: 'amber', ratio: '1/1' },
  },
  {
    id: 'test-paulette',
    name: 'Customer D',
    role: 'Programme participant',
    quote:
      'Signing up was one of the best decisions I made this year. The step by step plan gave me the structure I had been missing.',
    result: 'Reached the goals I set at the start',
    conditionTag: 'Verified customer',
    isSelfReported: true,
    image: { alt: 'Placeholder portrait image', tone: 'sage', ratio: '1/1' },
  },
];
