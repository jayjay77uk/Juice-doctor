import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';
import { ph } from '@/content/placeholder';

export const metadata: Metadata = createMetadata({
  title: ph.metaTitle,
  description: ph.metaDescription,
  path: '/disclaimer',
});

export default function DisclaimerPage() {
  return (
    <LegalPage
      title={ph.heading}
      intro={ph.lead}
      sections={[
        {
          heading: ph.subheading,
          body: ph.body,
        },
        {
          heading: ph.subheading,
          body: ph.body,
        },
        {
          heading: ph.subheading,
          body: ph.body,
        },
      ]}
    />
  );
}
