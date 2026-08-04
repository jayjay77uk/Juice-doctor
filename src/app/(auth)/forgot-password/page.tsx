import type { Metadata } from 'next';
import Link from 'next/link';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { ForgotPasswordForm } from '@/components/sections/forgot-password-form';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = createMetadata({
  title: 'Forgot password',
  description: 'Request a link to reset your password.',
  path: '/forgot-password',
});

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Forgot your password?</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your email and we&rsquo;ll send you a link to set a new one.
        </p>
      </div>
      <ForgotPasswordForm authReal={isSupabaseConfigured()} />
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href={routes.login.href} className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
