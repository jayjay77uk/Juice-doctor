import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';

export const metadata: Metadata = createMetadata({
  title: 'Medical Disclaimer',
  path: '/disclaimer',
});

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Medical Disclaimer"
      intro="Important information about the nature of our services."
      sections={[
        {
          heading: 'Not medical advice',
          body: 'Ask Juice Doctor provides natural-health coaching and education. Our programmes, assessments and content are not medical advice, diagnosis or treatment, and do not replace care from a qualified medical professional.',
        },
        {
          heading: 'Assessments are indicative',
          body: 'The Body MOT and Remote Selfie Scan provide indicative wellbeing information to guide lifestyle choices. They are not diagnostic tools and — in this prototype — do not perform any real clinical assessment.',
        },
        {
          heading: 'Always consult your doctor',
          body: 'Always seek the advice of your GP or a qualified health provider with any questions about a medical condition. Never disregard professional medical advice because of something you read here.',
        },
      ]}
    />
  );
}
