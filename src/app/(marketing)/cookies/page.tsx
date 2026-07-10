import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { LegalPage } from '@/components/sections/legal-page';

export const metadata: Metadata = createMetadata({ title: 'Cookie Notice', path: '/cookies' });

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Notice"
      intro="How we would use cookies and similar technologies in the full platform."
      sections={[
        {
          heading: 'Essential cookies',
          body: 'These keep the site working — remembering your session and preferences. In this prototype, only minimal, non-tracking storage is used.',
        },
        {
          heading: 'Analytics',
          body: 'In production, privacy-respecting analytics would help us improve the experience. None are active in this prototype.',
        },
        {
          heading: 'Your choices',
          body: 'You would be able to manage non-essential cookies at any time through the consent controls.',
        },
      ]}
    />
  );
}
