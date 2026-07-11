import type { Metadata } from 'next';
import Link from 'next/link';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { AuthForm } from '@/components/sections/auth-form';

export const metadata: Metadata = createMetadata({ title: 'Create an account', description: 'Create a new account to get started.', path: '/register' });

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Create an account</h1>
        <p className="mt-2 text-muted-foreground">Sign up to get started. This is placeholder text in clear English.</p>
      </div>
      <AuthForm mode="register" />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={routes.login.href} className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
