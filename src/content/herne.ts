import type { FaqItem, HernePillar, Stat } from '@/types/content';

/**
 * The HERNE Protocol — the brand's central framework and the site's design
 * spine. Five pillars: Hydration, Elimination, Rest, Nutrition, Exercise.
 */
export const hernePillars: HernePillar[] = [
  {
    key: 'hydration',
    letter: 'H',
    name: 'Hydration',
    tagline: 'The foundation everything else is built on.',
    description:
      'Most people are chronically under-watered, not simply "not drinking enough". We restore true cellular hydration — the difference between fluid passing through you and water actually reaching your cells.',
    points: [
      'Cellular hydration, not just fluid intake',
      'Electrolyte and mineral balance',
      'The role of water in energy and focus',
    ],
    tone: 'teal',
  },
  {
    key: 'elimination',
    letter: 'E',
    name: 'Elimination',
    tagline: 'A body that clears waste efficiently can heal.',
    description:
      'Restoration depends on removal. We support the body’s natural elimination pathways so it can offload what it no longer needs and create room to rebuild.',
    points: ['Digestive and gut support', 'Natural detox pathways', 'Reducing the daily toxic load'],
    tone: 'green',
  },
  {
    key: 'rest',
    letter: 'R',
    name: 'Rest',
    tagline: 'Recovery is where change actually happens.',
    description:
      'The body repairs when it rests. We treat sleep and nervous-system recovery as active parts of the protocol, not an afterthought.',
    points: ['Sleep quality and rhythm', 'Nervous-system regulation', 'Stress and recovery balance'],
    tone: 'sage',
  },
  {
    key: 'nutrition',
    letter: 'N',
    name: 'Nutrition',
    tagline: 'Food as information, not just fuel.',
    description:
      'What you eat speaks to every cell. We focus on nutrient density and the signals food sends the body — building a way of eating you can actually sustain.',
    points: ['Nutrient density over restriction', 'Blood-sugar and energy stability', 'Sustainable, real-food habits'],
    tone: 'amber',
  },
  {
    key: 'exercise',
    letter: 'E',
    name: 'Exercise',
    tagline: 'Movement that restores, not depletes.',
    description:
      'The right movement circulates, strengthens and energises. We match activity to where your body actually is — so exercise gives back more than it takes.',
    points: ['Movement matched to your capacity', 'Circulation and lymphatic flow', 'Strength and resilience over time'],
    tone: 'teal',
  },
];

/**
 * Headline outcomes. These are SELF-REPORTED figures from the existing brand
 * and are surfaced with an explicit footnote until they can be substantiated
 * (approval-gate item: source / sample size / methodology).
 */
export const herneStats: Stat[] = [
  { value: '92%', label: 'reported more daily energy', note: 'self-reported' },
  { value: '87%', label: 'improved digestion in 21 days', note: 'self-reported' },
  { value: '3×', label: 'greater mental clarity', note: 'self-reported' },
];

export const herneFaqs: FaqItem[] = [
  {
    question: 'Is the HERNE Protocol a diet?',
    answer:
      'No. It is a five-pillar framework for restoring your inner environment. Nutrition is one pillar of five — the goal is a responsive, resilient body, not a short-term diet.',
  },
  {
    question: 'Do I have to give up everything I enjoy?',
    answer:
      'The protocol is built to be sustainable. It focuses on adding what your body needs and gently reducing what drains it, rather than punishing restriction.',
  },
  {
    question: 'How is this different from generic wellness advice?',
    answer:
      'HERNE connects hydration, elimination, rest, nutrition and exercise into one system, sequenced to your body — rather than treating each in isolation.',
  },
];
