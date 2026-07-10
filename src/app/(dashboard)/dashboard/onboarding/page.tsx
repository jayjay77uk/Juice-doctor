import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard';

export const metadata: Metadata = createMetadata({ title: 'Get started' });

export default function OnboardingPage() {
  return (
    <div className="py-6">
      <OnboardingWizard />
    </div>
  );
}
