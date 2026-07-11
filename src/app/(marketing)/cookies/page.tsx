import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';
import { ph } from '@/content/placeholder';

export const metadata: Metadata = createMetadata({ title: ph.metaTitle, description: ph.metaDescription, path: '/cookies' });

export default function CookiesPage() {
  return (
    <LegalPage
      title={ph.heading}
      intro={ph.lead}
      sections={[
        {
          heading: ph.subheading,
          body: `${ph.body} In this prototype, only minimal, non-tracking storage is used.`,
        },
        {
          heading: ph.subheading,
          body: `${ph.body} None are active in this prototype.`,
        },
        {
          heading: ph.subheading,
          body: ph.body,
        },
      ]}
    />
  );
}
