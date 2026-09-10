import type { FaqItem, Pillar, Stat } from '@/types/content';

export const frameworkPillars: Pillar[] = [
  {
    key: 'hydration',
    letter: 'H',
    name: 'Hydration',
    tagline: 'Support the body with consistent hydration.',
    description: 'Hydration is the first pillar of HERNE and keeps fluid intake visible as part of the wider wellbeing picture.',
    points: ['Build a consistent hydration routine', 'Notice hydration alongside energy and recovery', 'Keep hydration connected to the wider plan'],
    tone: 'teal',
  },
  {
    key: 'elimination',
    letter: 'E',
    name: 'Elimination',
    tagline: 'Make healthy elimination part of the conversation.',
    description: 'The elimination pillar keeps digestive and elimination patterns in view rather than treating them as an isolated topic.',
    points: ['Track patterns that matter to you', 'Discuss changes in context', 'Connect digestive habits with the wider framework'],
    tone: 'green',
  },
  {
    key: 'rest',
    letter: 'R',
    name: 'Rest',
    tagline: 'Give recovery and restorative sleep a clear place.',
    description: 'Rest covers sleep, recovery and the routines that help make both easier to understand over time.',
    points: ['Make sleep part of the care conversation', 'Look at recovery alongside daily habits', 'Build practical routines around rest'],
    tone: 'sage',
  },
  {
    key: 'nutrition',
    letter: 'N',
    name: 'Nutrition',
    tagline: 'Build practical nutrition habits around real life.',
    description: 'Nutrition is considered alongside the other HERNE pillars so food choices can be discussed in the context of the whole journey.',
    points: ['Keep food choices practical', 'Connect nutrition with energy and routines', 'Use specialist support when deeper guidance is needed'],
    tone: 'amber',
  },
  {
    key: 'exercise',
    letter: 'E',
    name: 'Exercise',
    tagline: 'Use movement to support long-term wellbeing.',
    description: 'Exercise brings movement, strength and activity into the same shared framework as hydration, rest and nutrition.',
    points: ['Build movement into daily life', 'Consider recovery alongside activity', 'Keep goals connected to the wider wellbeing plan'],
    tone: 'teal',
  },
];

export const frameworkStats: Stat[] = [
  { value: '5', label: 'HERNE wellbeing pillars', note: 'one framework' },
  { value: '8', label: 'specialist roles', note: 'one coordinated team' },
  { value: '1', label: 'shared care journey', note: 'context that stays connected' },
];

export const frameworkFaqs: FaqItem[] = [
  {
    question: 'What does HERNE stand for?',
    answer: 'HERNE brings together Hydration, Elimination, Rest, Nutrition and Exercise as five connected pillars of the Ask Juice Doctor wellbeing framework.',
  },
  {
    question: 'How does the specialist team fit into HERNE?',
    answer: 'Makela helps route each conversation to the right specialist role while the wider care journey stays connected across the platform.',
  },
  {
    question: 'Do I have to start with a specialist?',
    answer: 'No. You can begin with Makela, explain what you need in your own words, and use that conversation to find the most relevant next step.',
  },
];
