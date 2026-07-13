/**
 * Client-supplied public experience copy for each specialist (from the
 * "Agent Description and Roles" document — source of truth). Portraits: the client
 * supplied finished cards for Makela and Serena; the other six have no portrait
 * yet, so they use a monogram and are flagged awaiting_client_approval. No copy is
 * invented — all eight profiles were supplied.
 */

export type ExperienceStatus = 'client_supplied' | 'awaiting_client_approval';

export interface SpecialistExperience {
  websiteTitle: string;
  opening: string;
  intro: string[];
  howICanHelp: string[];
  closing: string;
  portrait: string | null;
  portraitStatus: ExperienceStatus;
  copyStatus: ExperienceStatus;
}

export const HERNE_SPECIALIST_EXPERIENCE: Record<string, SpecialistExperience> = {
  makela: {
    websiteTitle: 'Your Wellbeing Concierge',
    opening: `You don't have to figure it all out on your own.`,
    intro: [
      `I'm Makela, your personal wellbeing concierge.`,
      `Whether you're feeling exhausted, overwhelmed, living with ongoing symptoms, or simply want to take better care of your health, I'm here to listen first.`,
      `I'll take the time to understand where you are today, what you're hoping to achieve, and what may be standing in your way. From there, I'll create your personalised wellbeing roadmap and introduce you to the specialists best suited to support you.`,
      `Think of me as your trusted guide throughout your journey. I'll make sure every recommendation works together, every specialist stays informed, and you always know what comes next.`,
    ],
    howICanHelp: [
      'Understanding your health concerns and goals',
      'Creating your personalised wellbeing plan',
      'Connecting you with the right specialists',
      'Coordinating your ongoing support',
      'Keeping your journey simple, organised and focused',
    ],
    closing: `Your wellbeing journey starts with one conversation.`,
    portrait: '/specialists/makela.png',
    portraitStatus: 'client_supplied',
    copyStatus: 'client_supplied',
  },
  serena: {
    websiteTitle: `Women's Health & Hormonal Wellbeing Specialist`,
    opening: `When something doesn't feel right, you deserve to be heard.`,
    intro: [
      `I'm Serena, and I support women through every stage of life.`,
      `Whether you're struggling with fatigue, hormone imbalance, painful periods, fertility concerns, PCOS, endometriosis, perimenopause, menopause or simply don't feel like yourself anymore, I'll help you understand what your body may be trying to tell you.`,
      `Together we'll explore your symptoms, lifestyle, health data and daily habits to create a personalised plan that supports your whole wellbeing, not just one symptom.`,
    ],
    howICanHelp: [
      'Hormonal health',
      'Menstrual health',
      'Fertility and reproductive wellbeing',
      'Perimenopause and menopause',
      'PCOS and endometriosis support',
      'Low energy and fatigue',
      'Weight changes',
      'Sleep, mood and emotional wellbeing',
    ],
    closing: `Your body isn't working against you. Let's learn how to support it together.`,
    portrait: '/specialists/serena.png',
    portraitStatus: 'client_supplied',
    copyStatus: 'client_supplied',
  },
  atlas: {
    websiteTitle: `Men's Health & Performance Specialist`,
    opening: `Looking after your health is a strength, not a weakness.`,
    intro: [
      `I'm Atlas.`,
      `I help men take control of their health with honest, confidential and practical support.`,
      `Whether you're concerned about your energy, fitness, prostate health, testosterone, fertility, sexual wellbeing or simply want to perform at your best, I'm here to help without judgement.`,
      `I also specialise in exercise physiology, strength, body composition and healthy ageing, helping both men and women build stronger, healthier bodies for the long term.`,
    ],
    howICanHelp: [
      `Men's health`,
      'Testosterone and hormonal wellbeing',
      'Prostate health',
      'Fertility and reproductive health',
      'Sexual wellbeing',
      'Strength and muscle development',
      'Fat loss',
      'Exercise programming',
      'Performance and recovery',
    ],
    closing: `Strong health builds every other part of life.`,
    portrait: null,
    portraitStatus: 'awaiting_client_approval',
    copyStatus: 'client_supplied',
  },
  aqua: {
    websiteTitle: 'Hydration & Cellular Wellness Specialist',
    opening: `Sometimes the smallest habit creates the biggest transformation.`,
    intro: [
      `I'm Aqua.`,
      `Proper hydration influences nearly every system in your body, yet it's one of the most overlooked parts of good health.`,
      `If you've struggled to drink enough water, dislike the taste, worry about frequent trips to the toilet or simply don't know how much you should be drinking, I'll help you find a solution that works for you.`,
      `Together we'll build realistic habits that improve your hydration and support your energy, focus, digestion and overall wellbeing.`,
    ],
    howICanHelp: [
      'Daily hydration habits',
      'Fatigue and brain fog',
      'Exercise recovery',
      'Healthy ageing',
      'Water retention',
      'Practical hydration strategies',
      'Hydration tracking',
      'Long-term healthy habits',
    ],
    closing: `Helping every cell in your body perform at its best.`,
    portrait: null,
    portraitStatus: 'awaiting_client_approval',
    copyStatus: 'client_supplied',
  },
  sage: {
    websiteTitle: 'Lifestyle Medicine & Gut Health Specialist',
    opening: `You shouldn't have to accept feeling unwell as your normal.`,
    intro: [
      `I'm Sage.`,
      `If you're constantly tired, bloated, struggling with your weight, living with digestive issues or simply don't feel as healthy as you know you could, I'll help you uncover the lifestyle patterns that may be holding you back.`,
      `Using our HERNE Protocol, we'll build practical, sustainable changes that fit into your real life, helping you restore energy, improve digestion and support long-term wellbeing.`,
    ],
    howICanHelp: [
      'Gut health',
      'Lifestyle transformation',
      'Weight management',
      'Fatigue',
      'Digestive wellbeing',
      'Inflammation',
      'Stress management',
      'Sleep optimisation',
      'Healthy habits',
    ],
    closing: `Small changes, consistently applied, create extraordinary health.`,
    portrait: null,
    portraitStatus: 'awaiting_client_approval',
    copyStatus: 'client_supplied',
  },
  luca: {
    websiteTitle: 'Personal Chef & Nutrition Planner',
    opening: `Healthy eating should feel simple, enjoyable and realistic.`,
    intro: [
      `I'm Luca.`,
      `I'll help you take the confusion out of nutrition by creating meal plans, recipes and shopping guides that fit your goals, lifestyle and taste.`,
      `Whether you're eating for weight loss, muscle gain, hormone balance, gut health or simply want healthier family meals, I'll help you enjoy food while supporting your wellbeing.`,
      `No fad diets. No unnecessary restrictions. Just personalised nutrition that works in everyday life.`,
    ],
    howICanHelp: [
      'Personalised meal plans',
      'Weekly menus',
      'Healthy recipes',
      'Shopping lists',
      'Family nutrition',
      'Weight management',
      'Sports nutrition',
      'Meal preparation',
    ],
    closing: `Great health begins with food you'll actually enjoy eating.`,
    portrait: null,
    portraitStatus: 'awaiting_client_approval',
    copyStatus: 'client_supplied',
  },
  felix: {
    websiteTitle: 'Supplement & Nutrient Optimisation Specialist',
    opening: `Supplements should support your health, not complicate it.`,
    intro: [
      `I'm Felix.`,
      `With thousands of products on the market, it's easy to feel overwhelmed. I'll help you understand which supplements may genuinely benefit you based on your goals, diet, lifestyle and available health information.`,
      `Together we'll build a personalised strategy that complements your nutrition and helps you make informed, evidence-based decisions.`,
    ],
    howICanHelp: [
      'Supplement reviews',
      'Personalised nutrient strategies',
      'Vitamin and mineral guidance',
      'Immune support',
      'Performance nutrition',
      'Healthy ageing',
      'Product comparisons',
      'Safe supplement planning',
    ],
    closing: `The right nutrients, for the right reasons, at the right time.`,
    portrait: null,
    portraitStatus: 'awaiting_client_approval',
    copyStatus: 'client_supplied',
  },
  optimus: {
    websiteTitle: 'Performance & Longevity Strategist',
    opening: `Good health isn't just about avoiding illness. It's about performing at your best.`,
    intro: [
      `I'm Optimus.`,
      `Designed for high performers, entrepreneurs, professionals and anyone committed to lifelong wellbeing, I help you optimise your health using real-time insights from your wearable devices, health data and lifestyle patterns.`,
      `Together we'll monitor your progress, identify opportunities for improvement and help you stay ahead of potential health challenges before they become problems.`,
      `If you're already investing in your health, I'll help you make every piece of data work harder for you.`,
    ],
    howICanHelp: [
      'Preventive health',
      'Wearable data analysis',
      'Recovery optimisation',
      'Sleep performance',
      'Longevity strategies',
      'Executive performance',
      'Athletic optimisation',
      'Health metrics and trends',
      'Personal wellbeing insights',
    ],
    closing: `Because the healthiest version of you performs better in every area of life.`,
    portrait: null,
    portraitStatus: 'awaiting_client_approval',
    copyStatus: 'client_supplied',
  },
};

/** The approved multilingual + voice statement (client-supplied). */
export const HERNE_MULTILINGUAL_STATEMENT =
  'Speak naturally, in your preferred language. Every specialist can communicate by voice or text in multiple languages and dialects, making expert wellbeing support feel personal, natural and accessible wherever you are.';
