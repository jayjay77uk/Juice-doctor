import type { Consultation, Programme } from '@/types/content';

/** Prototype placeholder content. */
export const programmes: Programme[] = [
  {
    id: 'prog-1',
    slug: 'programme-1',
    title: 'Programme one',
    summary:
      'A short summary of programme one goes here, describing who it is for and the main outcome it delivers.',
    description:
      'A fuller description of programme one goes here. This paragraph explains the approach, what participants work through, and the results they can expect by the end.',
    durationLabel: 'Duration placeholder',
    format: '1:1',
    priceLabel: 'Price on request',
    includes: [
      'Included item one',
      'Included item two',
      'Included item three',
      'Included item four',
      'Included item five',
    ],
    pillars: ['pillar-one', 'pillar-two', 'pillar-three', 'pillar-four', 'pillar-five'],
    featured: true,
    image: { alt: 'Placeholder image for programme one', tone: 'teal', ratio: '3/2' },
  },
  {
    id: 'prog-2',
    slug: 'programme-2',
    title: 'Programme two',
    summary:
      'A short summary of programme two goes here, describing who it is for and the main outcome it delivers.',
    description:
      'A fuller description of programme two goes here. This paragraph explains the approach, what participants work through, and the results they can expect by the end.',
    durationLabel: 'Duration placeholder',
    format: 'group',
    priceLabel: 'Price on request',
    includes: [
      'Included item one',
      'Included item two',
      'Included item three',
      'Included item four',
    ],
    pillars: ['pillar-one', 'pillar-two', 'pillar-three'],
    featured: true,
    image: { alt: 'Placeholder image for programme two', tone: 'green', ratio: '3/2' },
  },
  {
    id: 'prog-3',
    slug: 'programme-3',
    title: 'Programme three',
    summary:
      'A short summary of programme three goes here, describing who it is for and the main outcome it delivers.',
    description:
      'A fuller description of programme three goes here. This paragraph explains the approach, what participants work through, and the results they can expect by the end.',
    durationLabel: 'Duration placeholder',
    format: 'corporate',
    priceLabel: 'Price on request',
    includes: [
      'Included item one',
      'Included item two',
      'Included item three',
      'Included item four',
    ],
    pillars: ['pillar-one', 'pillar-three', 'pillar-four'],
    featured: false,
    image: { alt: 'Placeholder image for programme three', tone: 'sage', ratio: '3/2' },
  },
];

/** Consultation types. Prototype placeholder content. */
export const consultations: Consultation[] = [
  {
    id: 'con-1',
    slug: 'consultation-1',
    title: 'Consultation one',
    summary: 'A short summary of consultation one goes here, describing what the session covers.',
    durationLabel: 'Duration placeholder',
    priceLabel: 'Price on request',
    forWhom: 'Who this consultation is for goes here.',
    includes: ['Included item one', 'Included item two'],
  },
  {
    id: 'con-2',
    slug: 'consultation-2',
    title: 'Consultation two',
    summary: 'A short summary of consultation two goes here, describing what the session covers.',
    durationLabel: 'Duration placeholder',
    priceLabel: 'Price on request',
    forWhom: 'Who this consultation is for goes here.',
    includes: ['Included item one', 'Included item two', 'Included item three'],
  },
  {
    id: 'con-3',
    slug: 'consultation-3',
    title: 'Consultation three',
    summary: 'A short summary of consultation three goes here, describing what the session covers.',
    durationLabel: 'Duration placeholder',
    priceLabel: 'Price on request',
    forWhom: 'Who this consultation is for goes here.',
    includes: ['Included item one', 'Included item two', 'Included item three'],
  },
];
