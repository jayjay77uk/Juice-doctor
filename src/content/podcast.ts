import type { PodcastEpisode } from '@/types/content';

/**
 * Placeholder episodes. `audioUrl` is null in the prototype (no media is
 * hosted); Phase 2 points it at real hosting.
 */
export const podcastEpisodes: PodcastEpisode[] = [
  {
    id: 'ep-012',
    slug: 'episode-1',
    number: 12,
    title: 'Lorem ipsum dolor sit amet consectetur',
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    durationLabel: '48 min',
    publishedLabel: 'Latest',
    topics: ['Lorem', 'Ipsum', 'Dolor'],
    audioUrl: null,
  },
  {
    id: 'ep-011',
    slug: 'episode-2',
    number: 11,
    title: 'Lorem ipsum dolor sit amet consectetur',
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    durationLabel: '41 min',
    publishedLabel: 'Episode 11',
    topics: ['Lorem', 'Ipsum'],
    audioUrl: null,
  },
  {
    id: 'ep-010',
    slug: 'episode-3',
    number: 10,
    title: 'Lorem ipsum dolor sit amet',
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    durationLabel: '39 min',
    publishedLabel: 'Episode 10',
    topics: ['Lorem', 'Ipsum'],
    audioUrl: null,
  },
  {
    id: 'ep-009',
    slug: 'episode-4',
    number: 9,
    title: 'Lorem ipsum dolor sit amet consectetur',
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    durationLabel: '45 min',
    publishedLabel: 'Episode 9',
    topics: ['Lorem', 'Ipsum'],
    audioUrl: null,
  },
];
