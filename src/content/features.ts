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
  eyebrow: 'Lorem ipsum dolor',
  title: 'Lorem ipsum dolor sit amet',
  lede:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
  what: [
    {
      title: 'Lorem ipsum dolor',
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    },
    {
      title: 'Lorem ipsum dolor',
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    },
    {
      title: 'Lorem ipsum dolor',
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    },
  ],
  steps: [
    { title: 'Lorem ipsum dolor', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    { title: 'Lorem ipsum dolor', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    { title: 'Lorem ipsum dolor', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
  ],
  faqs: [
    {
      question: 'Lorem ipsum dolor sit amet?',
      answer:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    },
    {
      question: 'Lorem ipsum dolor sit amet?',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    },
  ],
};

export const selfieScan: SignatureFeature = {
  slug: 'remote-selfie-scan',
  eyebrow: 'Lorem ipsum dolor',
  title: 'Lorem ipsum dolor sit amet',
  lede:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
  what: [
    {
      title: 'Lorem ipsum dolor',
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
    },
    {
      title: 'Lorem ipsum dolor',
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
    },
    {
      title: 'Lorem ipsum dolor',
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
    },
  ],
  steps: [
    { title: 'Lorem ipsum dolor', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    { title: 'Lorem ipsum dolor', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    { title: 'Lorem ipsum dolor', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
  ],
  faqs: [
    {
      question: 'Lorem ipsum dolor sit amet?',
      answer:
        'In this prototype, nothing leaves your device — the scan is a demonstration only and no image is uploaded, stored or sent anywhere.',
    },
    {
      question: 'Lorem ipsum dolor sit amet?',
      answer:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
    },
  ],
};
