import type { SignatureFeature } from '@/types/content';

/**
 * Marketing content for the signature assessment features. The interactive
 * mechanics live in their page components; this is the surrounding copy.
 *
 * Prototype note: neither feature performs a real medical assessment. What the
 * scans actually measure is unconfirmed with the client (see approval gate) —
 * copy here is deliberately outcome-framed, not diagnostic.
 */

export const bodyMot: SignatureFeature = {
  slug: 'body-mot',
  eyebrow: 'Signature Assessment',
  title: 'The Body MOT',
  lede:
    'You service your car every year. When did you last give your body the same attention? The Body MOT is a full, structured health assessment — a clear picture of where you are, and the exact next step.',
  what: [
    {
      title: 'Whole-body picture',
      body: 'We look across all five HERNE pillars, not one number in isolation — how hydrated, rested and nourished your body really is.',
    },
    {
      title: 'Your personal baseline',
      body: 'A clear starting point you can measure progress against, so change is something you can see, not just hope for.',
    },
    {
      title: 'A prioritised plan',
      body: 'You leave knowing exactly which pillar to focus on first — the single change that will move the needle most for you.',
    },
  ],
  steps: [
    { title: 'Complete your assessment', body: 'A structured review of your health, habits and history.' },
    { title: 'Review with Erran', body: 'We walk through what it reveals, together, in plain language.' },
    { title: 'Receive your roadmap', body: 'A prioritised, personalised plan built on the HERNE Protocol.' },
  ],
  faqs: [
    {
      question: 'Is the Body MOT a medical diagnosis?',
      answer:
        'No. It is a wellbeing assessment that maps your habits and health against the HERNE Protocol. It does not replace advice from your doctor.',
    },
    {
      question: 'How long does it take?',
      answer: 'The assessment and review together take around ninety minutes.',
    },
  ],
};

export const selfieScan: SignatureFeature = {
  slug: 'remote-selfie-scan',
  eyebrow: 'At-Home Assessment',
  title: 'The Remote Selfie Scan',
  lede:
    'Your first wellbeing check-in, from wherever you are. Take a guided selfie and answer a few questions to receive an instant, indicative wellbeing snapshot — the easiest possible first step.',
  what: [
    {
      title: 'From your own home',
      body: 'No appointment, no travel. All you need is your phone and two minutes.',
    },
    {
      title: 'Instant snapshot',
      body: 'An indicative reading across the pillars that matter most, right away.',
    },
    {
      title: 'A guided next step',
      body: 'A clear recommendation for how to go deeper — a Body MOT, a programme, or a conversation.',
    },
  ],
  steps: [
    { title: 'Position your camera', body: 'A short, guided capture — we show you exactly what to do.' },
    { title: 'Answer a few questions', body: 'A handful of quick prompts about how you feel day to day.' },
    { title: 'See your snapshot', body: 'An indicative wellbeing reading and your recommended next step.' },
  ],
  faqs: [
    {
      question: 'Is my image stored or shared?',
      answer:
        'In this prototype, nothing leaves your device — the scan is a demonstration only and no image is uploaded, stored or sent anywhere.',
    },
    {
      question: 'Is this a medical scan?',
      answer:
        'No. It is an indicative wellbeing snapshot to guide your next step, not a medical assessment or diagnosis.',
    },
  ],
};
