import specialistsJson from './specialists.json';
import { HERNE_STARTER_PROMPTS } from './prompts';
import { HERNE_SPECIALIST_CONTENT, type ContentStatus } from './specialist-content';

/**
 * The reusable specialist profile model. Merges the client role specification
 * (herne_specialists.json), the experience content (greetings, philosophies,
 * output formats) and the starter system prompt into ONE structured profile per
 * specialist. Profiles are configuration — never hardcoded into page components.
 */

export interface HerneSpecialistProfile {
  specialistId: string;
  name: string;
  title: string;
  primaryFunction: string;
  primaryDomains: string;
  hernePriority: string;
  wearableAccess: string;
  allowedActions: string;
  mustNotDo: string;
  referralStyle: string;
  coreOutput: string;
  tone: string;
  principle: string;
  greeting: string;
  greetingStatus: ContentStatus;
  philosophy: string | null;
  philosophyStatus: ContentStatus;
  outputFormat: string[];
  starterPrompt: string;
}

interface SpecialistRow {
  Specialist_ID: string;
  Name: string;
  Role: string;
  Primary_Function: string;
  Primary_Domains: string;
  HERNE_Priority: string;
  Wearable_Access: string;
  Allowed_Actions: string;
  Must_Not_Do: string;
  Referral_Style: string;
  Core_Output: string;
  Tone: string;
}

/** The eight HERNE specialists, in coordinator-first order. */
export const HERNE_ORDER = ['makela', 'serena', 'atlas', 'aqua', 'sage', 'luca', 'felix', 'optimus'] as const;

export const HERNE_SPECIALIST_PROFILES: HerneSpecialistProfile[] = (specialistsJson as SpecialistRow[]).map((s) => {
  const content = HERNE_SPECIALIST_CONTENT[s.Specialist_ID];
  return {
    specialistId: s.Specialist_ID,
    name: s.Name,
    title: s.Role,
    primaryFunction: s.Primary_Function,
    primaryDomains: s.Primary_Domains,
    hernePriority: s.HERNE_Priority,
    wearableAccess: s.Wearable_Access,
    allowedActions: s.Allowed_Actions,
    mustNotDo: s.Must_Not_Do,
    referralStyle: s.Referral_Style,
    coreOutput: s.Core_Output,
    tone: s.Tone,
    principle: content?.principle ?? '',
    greeting: content?.greeting ?? `Hello — I am ${s.Name}. How can I help you today?`,
    greetingStatus: content?.greetingStatus ?? 'awaiting_client_approval',
    philosophy: content?.philosophy ?? null,
    philosophyStatus: content?.philosophyStatus ?? 'awaiting_client_approval',
    outputFormat: content?.outputFormat ?? [],
    starterPrompt: HERNE_STARTER_PROMPTS[s.Specialist_ID] ?? '',
  };
}).sort((a, b) => HERNE_ORDER.indexOf(a.specialistId as (typeof HERNE_ORDER)[number]) - HERNE_ORDER.indexOf(b.specialistId as (typeof HERNE_ORDER)[number]));

export function herneProfile(specialistId: string): HerneSpecialistProfile | undefined {
  return HERNE_SPECIALIST_PROFILES.find((p) => p.specialistId === specialistId);
}
