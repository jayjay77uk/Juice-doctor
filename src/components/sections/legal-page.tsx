import * as React from 'react';
import { Section } from '@/components/ui/section';
import { PageHero } from './page-hero';

export interface LegalSection {
  heading: string;
  body: string;
}

/** Shared layout for legal/policy pages. Copy is placeholder pending client-supplied text. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} lede={intro} />
      <Section tone="default" spacing="lg" containerSize="narrow">
        <div className="rounded-xl border border-dashed border-border-strong bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
          Placeholder copy — the final, legally reviewed wording is pending from the client and
          will replace the text below.
        </div>
        <div className="mt-10 flex flex-col gap-8">
          {sections.map((section, i) => (
            <section key={i} className="flex flex-col gap-2">
              <h2 className="text-h3 text-foreground">{section.heading}</h2>
              <p className="measure text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}
