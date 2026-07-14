import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { AuthForm } from '@/components/sections/auth-form';
import { isSupabaseConfigured } from '@/lib/env';
import { getSession } from '@/services/auth';
import { resolveLanding } from '@/lib/auth/landing';

export const metadata: Metadata = createMetadata({ title: 'Create an account', description: 'Create a new account to get started.', path: '/register' });

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const nextRaw = sp.next;
  const next = Array.isArray(nextRaw) ? nextRaw[0] : nextRaw;

  if (isSupabaseConfigured()) {
    const session = await getSession();
    if (session) redirect(resolveLanding(session.user.role, next));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Create an account</h1>
        <p className="mt-2 text-muted-foreground">Create your account to access your wellbeing dashboard.</p>
      </div>
      <AuthForm mode="register" authReal={isSupabaseConfigured()} next={next} />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={routes.login.href} className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
