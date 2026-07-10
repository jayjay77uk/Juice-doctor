import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';

export const metadata: Metadata = createMetadata({ title: 'Privacy Policy', path: '/privacy' });

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How we would handle your personal information in the full platform."
      sections={[
        {
          heading: 'What we collect',
          body: 'In production we would collect only the information needed to provide our services — such as your name, contact details and the information you share during consultations. In this prototype, no personal data is collected or stored.',
        },
        {
          heading: 'How we use it',
          body: 'Your information would be used solely to deliver and improve our coaching services and to communicate with you. We would never sell your data.',
        },
        {
          heading: 'Your rights',
          body: 'You would have the right to access, correct or delete your personal information at any time, in line with UK GDPR.',
        },
      ]}
    />
  );
}
