import type { Metadata } from 'next';
import Link from 'next/link';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { AuthForm } from '@/components/sections/auth-form';

export const metadata: Metadata = createMetadata({ title: 'Log in', description: 'Log in to your account.', path: '/login' });

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">Log in to your account to continue.</p>
      </div>
      <AuthForm mode="login" />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href={routes.register.href} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
