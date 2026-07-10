import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';

export const metadata: Metadata = createMetadata({ title: 'Terms of Service', path: '/terms' });

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="The terms that would govern use of the Ask Juice Doctor platform."
      sections={[
        {
          heading: 'Using this service',
          body: 'By using the platform you would agree to these terms. Our services support your wellbeing and are not a substitute for medical care.',
        },
        {
          heading: 'Bookings and payments',
          body: 'Programme and consultation terms, cancellation policies and payment terms would be set out here. No payments are processed in this prototype.',
        },
        {
          heading: 'Liability',
          body: 'The scope and limits of our liability would be described here, alongside your responsibilities as a client.',
        },
      ]}
    />
  );
}
