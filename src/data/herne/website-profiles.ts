import { HERNE_ORDER, herneProfile } from './specialist-profiles';
import { HERNE_SPECIALIST_EXPERIENCE, type ExperienceStatus } from './specialist-experience';

/**
 * The full public website profile per specialist — merges the role/scope config
 * (specialists.json + content) with the client experience copy + portrait. Pages
 * load from here; nothing is hardcoded in components.
 */

export interface WebsiteProfile {
  slug: string;
  name: string;
  title: string;
  principle: string;
  greeting: string;
  greetingStatus: ExperienceStatus;
  philosophy: string | null;
  philosophyStatus: ExperienceStatus;
  opening: string;
  intro: string[];
  howICanHelp: string[];
  closing: string;
  portrait: string | null;
  portraitStatus: ExperienceStatus;
  copyStatus: ExperienceStatus;
  hernePriority: string;
  allowedActions: string;
  mustNotDo: string;
  referralStyle: string;
  wearableAccess: string;
  tone: string;
  isConcierge: boolean;
}

export function websiteProfiles(): WebsiteProfile[] {
  return HERNE_ORDER.map((slug) => {
    const p = herneProfile(slug);
    const e = HERNE_SPECIALIST_EXPERIENCE[slug];
    return {
      slug,
      name: p?.name ?? slug,
      title: e?.websiteTitle ?? p?.title ?? '',
      principle: p?.principle ?? '',
      greeting: p?.greeting ?? '',
      greetingStatus: (p?.greetingStatus as ExperienceStatus) ?? 'awaiting_client_approval',
      philosophy: p?.philosophy ?? null,
      philosophyStatus: (p?.philosophyStatus as ExperienceStatus) ?? 'awaiting_client_approval',
      opening: e?.opening ?? '',
      intro: e?.intro ?? [],
      howICanHelp: e?.howICanHelp ?? [],
      closing: e?.closing ?? '',
      portrait: e?.portrait ?? null,
      portraitStatus: e?.portraitStatus ?? 'awaiting_client_approval',
      copyStatus: e?.copyStatus ?? 'awaiting_client_approval',
      hernePriority: p?.hernePriority ?? '',
      allowedActions: p?.allowedActions ?? '',
      mustNotDo: p?.mustNotDo ?? '',
      referralStyle: p?.referralStyle ?? '',
      wearableAccess: p?.wearableAccess ?? '',
      tone: p?.tone ?? '',
      isConcierge: slug === 'makela',
    };
  });
}

export function websiteProfile(slug: string): WebsiteProfile | undefined {
  return websiteProfiles().find((p) => p.slug === slug);
}

export { HERNE_MULTILINGUAL_STATEMENT } from './specialist-experience';
export { HERNE_SHARED_DNA } from './specialist-content';
