import type { Resource } from '@/types/content';

/** Resources — articles, guides and recipes. Placeholder content. */
export const resources: Resource[] = [
  {
    id: 'res-sugar-cravings',
    slug: 'secrets-to-overcoming-sugar-cravings',
    title: 'The Secrets to Overcoming Sugar Cravings',
    excerpt:
      'Cravings are signals, not failures. Here is what your body is really asking for — and how to answer it.',
    category: 'article',
    readingTimeLabel: '6 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Fresh fruit arranged on a warm surface', tone: 'amber', ratio: '3/2' },
  },
  {
    id: 'res-colon-health',
    slug: 'why-elimination-matters',
    title: 'Why Elimination Matters More Than You Think',
    excerpt: 'The pillar nobody talks about — and why a body that clears waste well is a body that can heal.',
    category: 'article',
    readingTimeLabel: '8 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Botanical detail, softly lit', tone: 'green', ratio: '3/2' },
  },
  {
    id: 'res-morning-ritual',
    slug: 'the-five-minute-morning-hydration-ritual',
    title: 'The Five-Minute Morning Hydration Ritual',
    excerpt: 'A simple, repeatable way to start the day properly hydrated — and why it changes everything after.',
    category: 'guide',
    readingTimeLabel: '4 min read',
    publishedLabel: 'Guides',
    image: { alt: 'A glass of water in morning light', tone: 'teal', ratio: '3/2' },
  },
  {
    id: 'res-green-juice',
    slug: 'the-restorative-green-juice',
    title: 'The Restorative Green Juice',
    excerpt: 'Our signature recipe — nutrient-dense, genuinely delicious, and kind to your digestion.',
    category: 'recipe',
    readingTimeLabel: '3 min read',
    publishedLabel: 'Recipes',
    image: { alt: 'A fresh green juice being poured', tone: 'green', ratio: '3/2' },
  },
];
