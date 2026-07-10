import type { Consultation, Programme } from '@/types/content';

/** Coaching programmes — HERNE-Protocol-led. Prototype placeholder content. */
export const programmes: Programme[] = [
  {
    id: 'prog-lifestyle-change',
    slug: 'lifestyle-change-programme',
    title: 'The Lifestyle Change Programme',
    summary:
      'Our flagship transformation — the full HERNE Protocol delivered over twelve weeks with one-to-one guidance.',
    description:
      'A complete reset of your inner environment. Over twelve weeks we work through all five pillars of the HERNE Protocol together, adapting the pace to your body and your life so the change actually lasts.',
    durationLabel: '12 weeks · 1:1',
    format: '1:1',
    priceLabel: 'From £1,950',
    includes: [
      'Full Body MOT health assessment',
      'Personalised HERNE Protocol plan',
      'Weekly one-to-one coaching calls',
      'Nutrition and hydration blueprint',
      'Direct messaging support',
    ],
    pillars: ['hydration', 'elimination', 'rest', 'nutrition', 'exercise'],
    featured: true,
    image: { alt: 'A calm, bright space representing renewal', tone: 'teal', ratio: '3/2' },
  },
  {
    id: 'prog-reset-21',
    slug: '21-day-reset',
    title: 'The 21-Day Reset',
    summary:
      'A focused three-week introduction to the protocol — build the foundations of hydration, elimination and rest.',
    description:
      'The perfect first step. Three weeks to feel the difference restoring your inner environment can make, with group guidance and a clear daily structure.',
    durationLabel: '21 days · Group',
    format: 'group',
    priceLabel: 'From £295',
    includes: [
      'Guided 21-day HERNE foundation',
      'Group coaching sessions',
      'Daily structure and recipes',
      'Private community access',
    ],
    pillars: ['hydration', 'elimination', 'rest'],
    featured: true,
    image: { alt: 'Fresh produce and water, warmly lit', tone: 'green', ratio: '3/2' },
  },
  {
    id: 'prog-corporate',
    slug: 'corporate-wellbeing',
    title: 'Corporate Wellbeing',
    summary:
      'The HERNE Protocol for teams — energy, focus and resilience delivered to your organisation.',
    description:
      'Bring restorative health to your workplace. Workshops, talks and team programmes that translate the protocol into practical daily habits for busy people.',
    durationLabel: 'Bespoke · Corporate',
    format: 'corporate',
    priceLabel: 'On enquiry',
    includes: [
      'Tailored to your organisation',
      'Workshops and keynote talks',
      'Team habit programmes',
      'Measurement and follow-up',
    ],
    pillars: ['hydration', 'rest', 'nutrition'],
    featured: false,
    image: { alt: 'A bright, modern workplace', tone: 'sage', ratio: '3/2' },
  },
];

/** Consultation types — the entry points to working with Erran. */
export const consultations: Consultation[] = [
  {
    id: 'con-discovery',
    slug: 'discovery-call',
    title: 'Discovery Call',
    summary: 'A free, no-pressure conversation to understand your goals and see if we are a fit.',
    durationLabel: '20 minutes',
    priceLabel: 'Complimentary',
    forWhom: 'Anyone considering working with us',
    includes: ['Your health goals reviewed', 'The right next step recommended'],
  },
  {
    id: 'con-initial',
    slug: 'initial-consultation',
    title: 'Initial Consultation',
    summary: 'A deep first session — your history, your symptoms and the beginnings of your plan.',
    durationLabel: '60 minutes',
    priceLabel: 'From £145',
    forWhom: 'Those ready to begin',
    includes: ['Full health history review', 'Initial HERNE assessment', 'First-step recommendations'],
  },
  {
    id: 'con-followup',
    slug: 'follow-up-session',
    title: 'Follow-Up Session',
    summary: 'Ongoing one-to-one support to keep your protocol on track and evolving.',
    durationLabel: '45 minutes',
    priceLabel: 'From £95',
    forWhom: 'Existing clients',
    includes: ['Progress review', 'Plan adjustments', 'Continued accountability'],
  },
];
