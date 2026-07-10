import type { Metadata } from 'next';
import { Mail, MapPin, Clock } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { site } from '@/content/site';
import { Section } from '@/components/ui/section';
import { PageHero } from '@/components/sections/page-hero';
import { ContactForm } from '@/components/sections/contact-form';

export const metadata: Metadata = createMetadata({
  title: 'Contact',
  description: `Get in touch with the ${site.name} team.`,
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let’s start the conversation"
        lede="Whether you’re ready to begin or simply have a question, we’d love to hear from you."
      />
      <Section tone="default" spacing="lg">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <ContactForm />
          <aside className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-7">
              {[
                { icon: Mail, label: 'Email', value: site.contact.email },
                { icon: MapPin, label: 'Based in', value: site.contact.location },
                { icon: Clock, label: 'Response time', value: 'Within 2 working days' },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-100 text-primary">
                    <row.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">{row.label}</p>
                    <p className="font-medium text-foreground">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="rounded-xl bg-surface-muted px-5 py-4 text-sm text-muted-foreground">
              This is a prototype. The contact form validates and confirms, but no message is
              actually sent and no details are stored.
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
