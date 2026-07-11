import type { Consultation, Programme } from '@/types/content';

/** Prototype placeholder content. */
export const programmes: Programme[] = [
  {
    id: 'prog-lifestyle-change',
    slug: 'programme-1',
    title: 'Lorem ipsum dolor sit amet',
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, ut enim ad minim veniam quis nostrud exercitation.',
    durationLabel: 'Lorem ipsum',
    format: '1:1',
    priceLabel: 'Lorem ipsum',
    includes: [
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
    ],
    pillars: ['hydration', 'elimination', 'rest', 'nutrition', 'exercise'],
    featured: true,
    image: { alt: 'Lorem ipsum dolor sit amet', tone: 'teal', ratio: '3/2' },
  },
  {
    id: 'prog-reset-21',
    slug: 'programme-2',
    title: 'Lorem ipsum dolor sit amet',
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam.',
    durationLabel: 'Lorem ipsum',
    format: 'group',
    priceLabel: 'Lorem ipsum',
    includes: [
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
    ],
    pillars: ['hydration', 'elimination', 'rest'],
    featured: true,
    image: { alt: 'Lorem ipsum dolor sit amet', tone: 'green', ratio: '3/2' },
  },
  {
    id: 'prog-corporate',
    slug: 'programme-3',
    title: 'Lorem ipsum dolor sit amet',
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam.',
    durationLabel: 'Lorem ipsum',
    format: 'corporate',
    priceLabel: 'Lorem ipsum',
    includes: [
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
      'Lorem ipsum dolor sit amet',
    ],
    pillars: ['hydration', 'rest', 'nutrition'],
    featured: false,
    image: { alt: 'Lorem ipsum dolor sit amet', tone: 'sage', ratio: '3/2' },
  },
];

/** Consultation types. Prototype placeholder content. */
export const consultations: Consultation[] = [
  {
    id: 'con-discovery',
    slug: 'consultation-1',
    title: 'Lorem ipsum dolor',
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    durationLabel: 'Lorem ipsum',
    priceLabel: 'Lorem ipsum',
    forWhom: 'Lorem ipsum dolor sit amet',
    includes: ['Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet'],
  },
  {
    id: 'con-initial',
    slug: 'consultation-2',
    title: 'Lorem ipsum dolor',
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    durationLabel: 'Lorem ipsum',
    priceLabel: 'Lorem ipsum',
    forWhom: 'Lorem ipsum dolor sit amet',
    includes: ['Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet'],
  },
  {
    id: 'con-followup',
    slug: 'consultation-3',
    title: 'Lorem ipsum dolor',
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    durationLabel: 'Lorem ipsum',
    priceLabel: 'Lorem ipsum',
    forWhom: 'Lorem ipsum dolor sit amet',
    includes: ['Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet'],
  },
];
