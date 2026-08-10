import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';

export const metadata: Metadata = createMetadata({
  title: 'Terms of service',
  description:
    'The terms that apply when using Ask Juice Doctor AI. Final approved wording will be supplied later.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="This is placeholder text in clear English. Final approved wording will be supplied later."
      sections={[
        {
          heading: 'Using the service',
          body: 'This is placeholder text describing the rules for using the service. Final approved wording will be supplied later.',
        },
        {
          heading: 'Accounts and responsibilities',
          body: 'This is placeholder text describing account use and user responsibilities. Final approved wording will be supplied later.',
        },
        {
          heading: 'Limitation of liability',
          body: 'This is placeholder text describing the limits of liability. Final approved wording will be supplied later.',
        },
      ]}
    />
  );
}
