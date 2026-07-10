import type { PodcastEpisode } from '@/types/content';

/**
 * The Juice Doctor Podcast — placeholder episodes. `audioUrl` is null in the
 * prototype (no media is hosted); Phase 2 points it at real hosting.
 */
export const podcastEpisodes: PodcastEpisode[] = [
  {
    id: 'ep-012',
    slug: 'hidden-toxins-draining-your-energy',
    number: 12,
    title: 'The Hidden Toxins Draining Your Energy — And How to Eliminate Them',
    summary:
      'Why modern life quietly overloads the body, how to spot the signs, and the simple eliminations that give your energy back.',
    durationLabel: '48 min',
    publishedLabel: 'Latest',
    topics: ['Detox', 'Energy', 'Elimination'],
    audioUrl: null,
  },
  {
    id: 'ep-011',
    slug: 'the-truth-about-hydration',
    number: 11,
    title: 'The Truth About Hydration (It’s Not About Drinking More Water)',
    summary:
      'Cellular hydration explained — the difference between water passing through you and water that actually reaches your cells.',
    durationLabel: '41 min',
    publishedLabel: 'Episode 11',
    topics: ['Hydration', 'Physiology'],
    audioUrl: null,
  },
  {
    id: 'ep-010',
    slug: 'sleep-the-forgotten-pillar',
    number: 10,
    title: 'Sleep: The Forgotten Pillar of Healing',
    summary:
      'Why recovery is where real change happens, and how to rebuild a night’s sleep that actually restores you.',
    durationLabel: '39 min',
    publishedLabel: 'Episode 10',
    topics: ['Rest', 'Recovery'],
    audioUrl: null,
  },
  {
    id: 'ep-009',
    slug: 'food-as-information',
    number: 9,
    title: 'Food as Information: Rethinking What You Eat',
    summary:
      'Every meal sends a signal to your cells. A grounded conversation on nutrient density over restriction.',
    durationLabel: '45 min',
    publishedLabel: 'Episode 9',
    topics: ['Nutrition', 'Metabolism'],
    audioUrl: null,
  },
];
