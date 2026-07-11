import type { Consultation, Programme } from '@/types/content';

/** Prototype placeholder content. */
export const programmes: Programme[] = [
  {
    id: 'prog-1',
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
    pillars: ['pillar-one', 'pillar-two', 'pillar-three', 'pillar-four', 'pillar-five'],
    featured: true,
    image: { alt: 'Lorem ipsum dolor sit amet', tone: 'teal', ratio: '3/2' },
  },
  {
    id: 'prog-2',
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
    pillars: ['pillar-one', 'pillar-two', 'pillar-three'],
    featured: true,
    image: { alt: 'Lorem ipsum dolor sit amet', tone: 'green', ratio: '3/2' },
  },
  {
    id: 'prog-3',
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
    pillars: ['pillar-one', 'pillar-three', 'pillar-four'],
    featured: false,
    image: { alt: 'Lorem ipsum dolor sit amet', tone: 'sage', ratio: '3/2' },
  },
];

/** Consultation types. Prototype placeholder content. */
export const consultations: Consultation[] = [
  {
    id: 'con-1',
    slug: 'consultation-1',
    title: 'Lorem ipsum dolor',
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    durationLabel: 'Lorem ipsum',
    priceLabel: 'Lorem ipsum',
    forWhom: 'Lorem ipsum dolor sit amet',
    includes: ['Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet'],
  },
  {
    id: 'con-2',
    slug: 'consultation-2',
    title: 'Lorem ipsum dolor',
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    durationLabel: 'Lorem ipsum',
    priceLabel: 'Lorem ipsum',
    forWhom: 'Lorem ipsum dolor sit amet',
    includes: ['Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet'],
  },
  {
    id: 'con-3',
    slug: 'consultation-3',
    title: 'Lorem ipsum dolor',
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    durationLabel: 'Lorem ipsum',
    priceLabel: 'Lorem ipsum',
    forWhom: 'Lorem ipsum dolor sit amet',
    includes: ['Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet', 'Lorem ipsum dolor sit amet'],
  },
];
