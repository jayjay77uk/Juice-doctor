import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { getOnboarding } from '@/services/onboarding';
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard';

export const metadata: Metadata = createMetadata({ title: 'Get started' });

export default async function OnboardingPage() {
  const state = await getOnboarding();
  return (
    <div className="py-6">
      <OnboardingWizard initial={state.answers} initialStep={state.step} available={state.available} />
    </div>
  );
}
