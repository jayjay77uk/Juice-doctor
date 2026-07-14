import type { SignatureFeature } from '@/types/content';

/**
 * Marketing content for the signature assessment features. The interactive
 * mechanics live in their page components; this is the surrounding copy.
 *
 * Prototype note: neither feature performs a real medical assessment. What the
 * scans actually measure is unconfirmed with the client (see approval gate) —
 * copy here is deliberately outcome-framed, not diagnostic.
 */

export const assessment: SignatureFeature = {
  slug: 'assessment',
  eyebrow: 'Assessment',
  title: 'The wellbeing assessment',
  lede:
    'This is a short introductory paragraph describing the assessment feature. It explains, in plain placeholder language, what the feature is for and what a visitor can expect from it.',
  what: [
    {
      title: 'What it does — point one',
      body: 'A clear placeholder sentence describing the first thing this feature offers to the person using it.',
    },
    {
      title: 'What it does — point two',
      body: 'A clear placeholder sentence describing the second thing this feature offers to the person using it.',
    },
    {
      title: 'What it does — point three',
      body: 'A clear placeholder sentence describing the third thing this feature offers to the person using it.',
    },
  ],
  steps: [
    { title: 'Step one', body: 'A short description of the first step in the process.' },
    { title: 'Step two', body: 'A short description of the second step in the process.' },
    { title: 'Step three', body: 'A short description of the third step in the process.' },
  ],
  faqs: [
    {
      question: 'Frequently asked question one?',
      answer:
        'A clear placeholder answer to the first frequently asked question about this feature.',
    },
    {
      question: 'Frequently asked question two?',
      answer: 'A clear placeholder answer to the second frequently asked question.',
    },
  ],
};

export const selfieScan: SignatureFeature = {
  slug: 'remote-selfie-scan',
  eyebrow: 'Feature eyebrow',
  title: 'Remote selfie scan feature title',
  lede:
    'This is a short introductory paragraph describing the remote selfie scan feature. It explains, in plain placeholder language, what the feature is for and what a visitor can expect from it.',
  what: [
    {
      title: 'What it does — point one',
      body: 'A clear placeholder sentence describing the first thing the selfie scan offers to the person using it.',
    },
    {
      title: 'What it does — point two',
      body: 'A clear placeholder sentence describing the second thing the selfie scan offers to the person using it.',
    },
    {
      title: 'What it does — point three',
      body: 'A clear placeholder sentence describing the third thing the selfie scan offers to the person using it.',
    },
  ],
  steps: [
    { title: 'Step one', body: 'A short description of the first step in the scan process.' },
    { title: 'Step two', body: 'A short description of the second step in the scan process.' },
    { title: 'Step three', body: 'A short description of the third step in the scan process.' },
  ],
  faqs: [
    {
      question: 'Is my image kept private?',
      answer:
        'In this prototype, nothing leaves your device — the scan is a demonstration only and no image is uploaded, stored or sent anywhere.',
    },
    {
      question: 'Frequently asked question two?',
      answer:
        'A clear placeholder answer to the second frequently asked question about the selfie scan.',
    },
  ],
};
