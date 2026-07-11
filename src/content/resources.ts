import type { Resource } from '@/types/content';

/** Resources — articles, guides and recipes. Placeholder content. */
export const resources: Resource[] = [
  {
    id: 'res-1',
    slug: 'resource-1',
    title: 'Article one',
    excerpt:
      'A clear introduction to the topic, covering the key ideas readers need to get started.',
    category: 'article',
    readingTimeLabel: '6 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Placeholder image', tone: 'amber', ratio: '3/2' },
  },
  {
    id: 'res-2',
    slug: 'resource-2',
    title: 'Article two',
    excerpt: 'A short overview that walks through the main points and offers practical next steps.',
    category: 'article',
    readingTimeLabel: '8 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Placeholder image', tone: 'green', ratio: '3/2' },
  },
  {
    id: 'res-3',
    slug: 'resource-3',
    title: 'Guide one',
    excerpt: 'A step-by-step guide that explains the process clearly from beginning to end.',
    category: 'guide',
    readingTimeLabel: '4 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Placeholder image', tone: 'teal', ratio: '3/2' },
  },
  {
    id: 'res-4',
    slug: 'resource-4',
    title: 'Recipe one',
    excerpt: 'A simple, step-by-step example with a short list and easy-to-follow instructions.',
    category: 'recipe',
    readingTimeLabel: '3 min read',
    publishedLabel: 'Recipes',
    image: { alt: 'Placeholder image', tone: 'green', ratio: '3/2' },
  },
];
