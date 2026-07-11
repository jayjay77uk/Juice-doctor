import * as React from 'react';
import { Sparkles, UserRoundCheck, HeartHandshake } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { SectionHeading } from './section-heading';
import { Reveal } from '@/components/ui/reveal';

const STEPS = [
  {
    icon: Sparkles,
    title: 'The Receptionist AI',
    body: 'Every visitor starts here. It consults you, understands your goals, and matches you with the right specialist — capturing your details along the way.',
  },
  {
    icon: UserRoundCheck,
    title: 'Your Specialist AI',
    body: 'Subscribe to a dedicated specialist AI for the pillar you want to master. It has its own knowledge, memory and personality — and it’s always available.',
  },
  {
    icon: HeartHandshake,
    title: 'A human expert',
    body: 'When something needs a person — low confidence or a real symptom — the receptionist escalates to our human expert, so you’re never left guessing.',
  },
];

/** The core customer journey: Receptionist → Specialist → Human. */
export function HowItWorks() {
  return (
    <Section tone="surface" spacing="lg">
      <SectionHeading
        eyebrow="How it works"
        title="One front door. A team of specialists. A human when it matters."
        intro="This isn’t a chatbot. It’s a coordinated AI wellness team, built around you."
      />
      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal as="li" key={step.title} delay={i * 80}>
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-cream-50 p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-teal-100 text-primary">
                  <step.icon className="size-5" />
                </span>
                <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="font-serif text-lg text-foreground">{step.title}</h3>
              <p className="text-muted-foreground">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
