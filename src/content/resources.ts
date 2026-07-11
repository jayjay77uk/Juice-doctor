import type { Resource } from '@/types/content';

/** Resources — articles, guides and recipes. Placeholder content. */
export const resources: Resource[] = [
  {
    id: 'res-1',
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
    id: 'res-2',
    slug: 'resource-2',
    title: 'Lorem ipsum dolor sit amet',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt.',
    category: 'article',
    readingTimeLabel: '8 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Placeholder image', tone: 'green', ratio: '3/2' },
  },
  {
    id: 'res-3',
    slug: 'resource-3',
    title: 'Lorem ipsum dolor sit amet',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.',
    category: 'guide',
    readingTimeLabel: '4 min read',
    publishedLabel: 'Guides',
    image: { alt: 'Placeholder image', tone: 'teal', ratio: '3/2' },
  },
  {
    id: 'res-4',
    slug: 'resource-4',
    title: 'Lorem ipsum dolor sit amet',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    category: 'recipe',
    readingTimeLabel: '3 min read',
    publishedLabel: 'Recipes',
    image: { alt: 'Placeholder image', tone: 'green', ratio: '3/2' },
  },
];
