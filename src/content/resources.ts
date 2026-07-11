import type { Resource } from '@/types/content';

/** Resources — articles, guides and recipes. Placeholder content. */
export const resources: Resource[] = [
  {
    id: 'res-sugar-cravings',
    slug: 'resource-1',
    title: 'Lorem ipsum dolor sit amet',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
    category: 'article',
    readingTimeLabel: '6 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Placeholder image', tone: 'amber', ratio: '3/2' },
  },
  {
    id: 'res-colon-health',
    slug: 'resource-2',
    title: 'Lorem ipsum dolor sit amet',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt.',
    category: 'article',
    readingTimeLabel: '8 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Placeholder image', tone: 'green', ratio: '3/2' },
  },
  {
    id: 'res-morning-ritual',
    slug: 'resource-3',
    title: 'Lorem ipsum dolor sit amet',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.',
    category: 'guide',
    readingTimeLabel: '4 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Placeholder image', tone: 'teal', ratio: '3/2' },
  },
  {
    id: 'res-green-juice',
    slug: 'resource-4',
    title: 'Lorem ipsum dolor sit amet',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    category: 'recipe',
    readingTimeLabel: '3 min read',
    publishedLabel: 'Recipes',
    image: { alt: 'Placeholder image', tone: 'green', ratio: '3/2' },
  },
];
