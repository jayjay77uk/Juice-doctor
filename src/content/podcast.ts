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
    title: 'Episode twelve: introduction and overview',
    summary:
      'A placeholder summary describing what this episode covers and why listeners might find it useful.',
    durationLabel: '48 min',
    publishedLabel: 'Latest',
    topics: ['Overview', 'Getting started'],
    audioUrl: null,
  },
  {
    id: 'ep-011',
    slug: 'episode-2',
    number: 11,
    title: 'Episode eleven: building a simple daily routine',
    summary:
      'A placeholder summary describing what this episode covers and why listeners might find it useful.',
    durationLabel: '41 min',
    publishedLabel: 'Episode 11',
    topics: ['Routines', 'Habits'],
    audioUrl: null,
  },
  {
    id: 'ep-010',
    slug: 'episode-3',
    number: 10,
    title: 'Episode ten: questions and answers',
    summary:
      'A placeholder summary describing what this episode covers and why listeners might find it useful.',
    durationLabel: '39 min',
    publishedLabel: 'Episode 10',
    topics: ['Q and A'],
    audioUrl: null,
  },
  {
    id: 'ep-009',
    slug: 'episode-4',
    number: 9,
    title: 'Episode nine: a closer look at the basics',
    summary:
      'A placeholder summary describing what this episode covers and why listeners might find it useful.',
    durationLabel: '45 min',
    publishedLabel: 'Episode 9',
    topics: ['Basics'],
    audioUrl: null,
  },
];
