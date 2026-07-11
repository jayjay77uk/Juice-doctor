import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';

export const metadata: Metadata = createMetadata({
  title: 'Privacy policy',
  description:
    'How this prototype handles personal information. Final approved wording will be supplied later.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="This is placeholder text in clear English. Final approved wording will be supplied later."
      sections={[
        {
          heading: 'Information we collect',
          body: 'This is placeholder text describing the kinds of information the service collects. Final approved wording will be supplied later.',
        },
        {
          heading: 'How we use your information',
          body: 'This is placeholder text describing how collected information is used. Final approved wording will be supplied later.',
        },
        {
          heading: 'Your rights and choices',
          body: 'This is placeholder text describing the choices and rights available to you. Final approved wording will be supplied later.',
        },
      ]}
    />
  );
}
