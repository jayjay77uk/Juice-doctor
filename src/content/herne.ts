import type { FaqItem, HernePillar, Stat } from '@/types/content';

/**
 * Development placeholder data. The framework structure (five pillars) is kept
 * intact; all human-readable wording is neutral placeholder text pending
 * approved copy.
 */
export const hernePillars: HernePillar[] = [
  {
    key: 'hydration',
    letter: 'H',
    name: 'Lorem ipsum',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
    points: [
      'Lorem ipsum dolor sit amet',
      'Consectetur adipiscing elit sed do',
      'Eiusmod tempor incididunt ut labore',
    ],
    tone: 'teal',
  },
  {
    key: 'elimination',
    letter: 'E',
    name: 'Lorem ipsum',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
    points: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit sed', 'Eiusmod tempor incididunt ut labore'],
    tone: 'green',
  },
  {
    key: 'rest',
    letter: 'R',
    name: 'Lorem ipsum',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud.',
    points: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit sed', 'Eiusmod tempor incididunt ut labore'],
    tone: 'sage',
  },
  {
    key: 'nutrition',
    letter: 'N',
    name: 'Lorem ipsum',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
    points: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit sed do', 'Eiusmod tempor incididunt ut labore'],
    tone: 'amber',
  },
  {
    key: 'exercise',
    letter: 'E',
    name: 'Lorem ipsum',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
    points: ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit sed do', 'Eiusmod tempor incididunt ut labore'],
    tone: 'teal',
  },
];

/**
 * Placeholder headline figures. Numeric structure is retained; labels are
 * neutral placeholder text pending approved, substantiated copy.
 */
export const herneStats: Stat[] = [
  { value: '92%', label: 'Lorem ipsum dolor sit amet', note: 'placeholder' },
  { value: '87%', label: 'Lorem ipsum dolor sit amet', note: 'placeholder' },
  { value: '3×', label: 'Lorem ipsum dolor sit amet', note: 'placeholder' },
];

export const herneFaqs: FaqItem[] = [
  {
    question: 'Lorem ipsum dolor sit amet, consectetur?',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  },
  {
    question: 'Lorem ipsum dolor sit amet consectetur adipiscing?',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
  },
  {
    question: 'Lorem ipsum dolor sit amet consectetur elit?',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
  },
];
