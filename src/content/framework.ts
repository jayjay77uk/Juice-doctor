import type { FaqItem, Pillar, Stat } from '@/types/content';

/**
 * Development placeholder data. The framework structure (five pillars) is kept
 * intact; all human-readable wording is neutral placeholder text pending
 * approved copy.
 */
export const frameworkPillars: Pillar[] = [
  {
    key: 'pillar-one',
    letter: '1',
    name: 'Pillar one',
    tagline: 'A short summary line describing the first pillar of the framework.',
    description:
      'This is placeholder copy describing the first pillar in a few sentences. It explains what this part of the framework covers and why it matters. Final approved wording will replace this text.',
    points: [
      'First supporting point for pillar one',
      'Second supporting point for pillar one',
      'Third supporting point for pillar one',
    ],
    tone: 'teal',
  },
  {
    key: 'pillar-two',
    letter: '2',
    name: 'Pillar two',
    tagline: 'A short summary line describing the second pillar of the framework.',
    description:
      'This is placeholder copy describing the second pillar in a few sentences. It explains what this part of the framework covers and why it matters. Final approved wording will replace this text.',
    points: ['First supporting point for pillar two', 'Second supporting point for pillar two', 'Third supporting point for pillar two'],
    tone: 'green',
  },
  {
    key: 'pillar-three',
    letter: '3',
    name: 'Pillar three',
    tagline: 'A short summary line describing the third pillar of the framework.',
    description:
      'This is placeholder copy describing the third pillar in a few sentences. It explains what this part of the framework covers and why it matters. Final approved wording will replace this text.',
    points: ['First supporting point for pillar three', 'Second supporting point for pillar three', 'Third supporting point for pillar three'],
    tone: 'sage',
  },
  {
    key: 'pillar-four',
    letter: '4',
    name: 'Pillar four',
    tagline: 'A short summary line describing the fourth pillar of the framework.',
    description:
      'This is placeholder copy describing the fourth pillar in a few sentences. It explains what this part of the framework covers and why it matters. Final approved wording will replace this text.',
    points: ['First supporting point for pillar four', 'Second supporting point for pillar four', 'Third supporting point for pillar four'],
    tone: 'amber',
  },
  {
    key: 'pillar-five',
    letter: '5',
    name: 'Pillar five',
    tagline: 'A short summary line describing the fifth pillar of the framework.',
    description:
      'This is placeholder copy describing the fifth pillar in a few sentences. It explains what this part of the framework covers and why it matters. Final approved wording will replace this text.',
    points: ['First supporting point for pillar five', 'Second supporting point for pillar five', 'Third supporting point for pillar five'],
    tone: 'teal',
  },
];

/**
 * Placeholder headline figures. Numeric structure is retained; labels are
 * neutral placeholder text pending approved, substantiated copy.
 */
export const frameworkStats: Stat[] = [
  { value: '92%', label: 'Placeholder statistic label one', note: 'placeholder' },
  { value: '87%', label: 'Placeholder statistic label two', note: 'placeholder' },
  { value: '3×', label: 'Placeholder statistic label three', note: 'placeholder' },
];

export const frameworkFaqs: FaqItem[] = [
  {
    question: 'What is this first frequently asked question about?',
    answer:
      'This is a placeholder answer to the first frequently asked question. It gives a clear, concise response in a few sentences. Final approved wording will replace this text.',
  },
  {
    question: 'What is this second frequently asked question about?',
    answer:
      'This is a placeholder answer to the second frequently asked question. It gives a clear, concise response in a few sentences. Final approved wording will replace this text.',
  },
  {
    question: 'What is this third frequently asked question about?',
    answer:
      'This is a placeholder answer to the third frequently asked question. It gives a clear, concise response in a few sentences. Final approved wording will replace this text.',
  },
];
