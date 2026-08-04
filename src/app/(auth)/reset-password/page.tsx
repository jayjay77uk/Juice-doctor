import type { Metadata } from 'next';
import { createMetadata } from '@/config/metadata';
import { ResetPasswordForm } from '@/components/sections/reset-password-form';

export const metadata: Metadata = createMetadata({
  title: 'Reset password',
  description: 'Choose a new password for your account.',
  path: '/reset-password',
});

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Choose a new password</h1>
        <p className="mt-2 text-muted-foreground">
          You&rsquo;re here from a reset link — set your new password below.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
