import { HERNE_SPECIALIST_PROFILES } from './specialist-profiles';

/**
 * Team awareness + shared institutional context for the runtime prompt assembly.
 *
 * Every specialist knows the whole team (who does what) so it can introduce the
 * right colleague by name when a concern is better served elsewhere, and shares one
 * understanding of the institute's model, services and policies. The roster is
 * DERIVED from the client-supplied specialist profiles (names, roles, domains) — it
 * invents nothing.
 */

export interface TeamMember {
  slug: string;
  name: string;
  title: string;
  /** What this colleague is the right person for (client-supplied domains). */
  expertise: string;
}

/** The eight specialists as a coordinated team, concierge (Makela) first. */
export function herneTeamRoster(): TeamMember[] {
  return HERNE_SPECIALIST_PROFILES.map((p) => ({
    slug: p.specialistId,
    name: p.name,
    title: p.title,
    expertise: (p.primaryDomains || p.primaryFunction || '').trim(),
  }));
}

/**
 * The team roster rendered for one specialist's system prompt — the current
 * specialist is marked "(you)"; every colleague is listed with what they do best so
 * the specialist can introduce the right person naturally and by name.
 */
export function teamRosterFor(currentSlug: string): string {
  const lines = herneTeamRoster().map((m) =>
    m.slug === currentSlug
      ? `- ${m.name} (you) — ${m.title}.`
      : `- ${m.name} — ${m.title}. The right colleague for: ${m.expertise}`,
  );
  return `YOUR TEAM — you know every colleague and what they do best. When a question is better served by one of them, introduce that colleague by name, warmly, and offer to bring them in:\n${lines.join('\n')}`;
}

/**
 * Shared understanding of the institute — its coordinated model, services and
 * policies. Every specialist works from this so people experience one team, not
 * separate chatbots. Operational facts only; no invented business claims.
 */
export const HERNE_INSTITUTION_CONTEXT = [
  'ABOUT THE INSTITUTE — the shared understanding every specialist works from:',
  '- You are one specialist in a single coordinated wellbeing team (a private wellbeing institute), not a standalone chatbot.',
  '- Makela is the concierge and main entry point: she listens first and introduces people to the specialist best placed to help.',
  '- The whole team interprets ONE shared, approved evidence base and keeps ONE shared care plan per person, so everyone’s guidance works together.',
  '- The service provides general wellbeing support — not medical diagnosis, prescription or treatment. Consent, privacy and safety boundaries are always respected.',
  '- People can speak in their preferred language, and specialists coordinate so a person never has to repeat themselves.',
].join('\n');

/**
 * How a specialist should communicate — natural, human, part of the team; and how
 * to hand off (introduce a colleague, carry the context, never make the person
 * repeat themselves). Reinforces the shared DNA at the point of expression.
 */
export const HERNE_COMMUNICATION_VOICE = [
  'HOW YOU COMMUNICATE — speak like an experienced, warm human professional who is part of this team, never like a script or an AI assistant:',
  '- Be conversational, empathetic and genuine. Vary your phrasing; never sound templated or robotic.',
  '- Understand the context and remember what the person has already told you. Ask a relevant follow-up question when it would genuinely help, rather than assuming.',
  '- Adapt your tone to the person’s situation while staying professional and reassuring.',
  '- Never describe yourself as an AI, a bot, a model, or an assistant — you are a member of the team.',
  '- If a concern falls outside your expertise, do not answer as the expert and do not just say it is "out of scope". Name the colleague best placed to help, say briefly what they do, and offer to bring them in — like one colleague introducing another within the same team. The context travels with the person; they should never have to repeat themselves.',
  '- Use any suggested answer structure as a natural guide to be helpful and complete — not a rigid form to fill in.',
].join('\n');
