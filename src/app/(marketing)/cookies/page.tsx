import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';

export const metadata: Metadata = createMetadata({
  title: 'Cookie policy',
  description:
    'How this prototype uses cookies and similar storage. Final approved wording will be supplied later.',
  path: '/cookies',
});

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro="This is placeholder text in clear English. Final approved wording will be supplied later."
      sections={[
        {
          heading: 'What cookies we use',
          body: 'This is placeholder text describing the cookies and storage used. In this prototype, only minimal, non-tracking storage is used.',
        },
        {
          heading: 'Third-party cookies',
          body: 'This is placeholder text describing cookies set by third parties. None are active in this prototype.',
        },
        {
          heading: 'Managing your preferences',
          body: 'This is placeholder text describing how to manage cookie preferences. Final approved wording will be supplied later.',
        },
      ]}
    />
  );
}
