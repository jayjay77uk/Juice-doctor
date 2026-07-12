import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { AuthForm } from '@/components/sections/auth-form';
import { isSupabaseConfigured } from '@/lib/env';
import { getSession } from '@/services/auth';
import { resolveLanding } from '@/lib/auth/landing';

export const metadata: Metadata = createMetadata({ title: 'Log in', description: 'Log in to your account.', path: '/login' });

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const nextRaw = sp.next;
  const next = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw;

  // Already signed in on the deployed platform: skip the form and go to the
  // area this user can actually enter (administrators → /admin).
  if (isSupabaseConfigured()) {
    const session = await getSession();
    if (session) redirect(resolveLanding(session.user.role, next));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">Log in to your account to continue.</p>
      </div>
      <AuthForm mode="login" authReal={isSupabaseConfigured()} next={next} />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href={routes.register.href} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
