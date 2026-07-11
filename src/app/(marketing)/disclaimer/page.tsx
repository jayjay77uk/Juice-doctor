import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';

export const metadata: Metadata = createMetadata({
  title: 'Disclaimer',
  description:
    'Important notices about the information on this prototype. Final approved wording will be supplied later.',
  path: '/disclaimer',
});

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Disclaimer"
      intro="This is placeholder text in clear English. Final approved wording will be supplied later."
      sections={[
        {
          heading: 'General information only',
          body: 'This is placeholder text explaining that the content is provided for general information only. Final approved wording will be supplied later.',
        },
        {
          heading: 'No professional advice',
          body: 'This is placeholder text explaining that the content is not a substitute for professional advice. Final approved wording will be supplied later.',
        },
        {
          heading: 'External links',
          body: 'This is placeholder text explaining that links to other sites are outside our control. Final approved wording will be supplied later.',
        },
      ]}
    />
  );
}
