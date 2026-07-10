import type { Testimonial } from '@/types/content';

/**
 * Testimonials — placeholder content modelled on the brand's real themes.
 * `isSelfReported` drives the honesty footnote. Real, consented testimonials
 * are client-supplied before the demo (see approval gate).
 */
export const testimonials: Testimonial[] = [
  {
    id: 'test-rachel',
    name: 'Rachel',
    role: 'Retail Manager',
    quote:
      'I had tried everything. Within three weeks I felt lighter, clearer and genuinely energised for the first time in years.',
    result: 'More energy in 3 weeks',
    isSelfReported: true,
    image: { alt: 'Portrait of a client, warmly lit', tone: 'teal', ratio: '1/1' },
  },
  {
    id: 'test-ebony',
    name: 'Ebony',
    role: 'Trainee Teacher',
    quote:
      'It was never about a quick fix. Erran helped me understand my own body — my skin cleared and my digestion finally settled.',
    result: 'Clearer skin & digestion',
    isSelfReported: true,
    image: { alt: 'Portrait of a client smiling', tone: 'green', ratio: '1/1' },
  },
  {
    id: 'test-claudine',
    name: 'Claudine',
    role: 'Speaker & Entrepreneur',
    quote:
      'The HERNE Protocol gave me a framework I could actually keep up with a demanding schedule. It changed how I show up every day.',
    result: 'Sustained energy & focus',
    isSelfReported: true,
    image: { alt: 'Portrait of a professional client', tone: 'amber', ratio: '1/1' },
  },
  {
    id: 'test-paulette',
    name: 'Paulette',
    role: 'Teacher',
    quote:
      'For the first time I felt listened to. The approach was gentle, human and grounded in how the body actually works.',
    result: 'A calmer, more responsive body',
    conditionTag: 'Living with Crohn’s',
    isSelfReported: true,
    image: { alt: 'Portrait of a client outdoors', tone: 'sage', ratio: '1/1' },
  },
];
