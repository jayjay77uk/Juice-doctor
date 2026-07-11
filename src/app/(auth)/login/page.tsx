import type { Metadata } from 'next';
import Link from 'next/link';
import { createMetadata } from '@/config/metadata';
import { routes } from '@/config/routes';
import { AuthForm } from '@/components/sections/auth-form';
import { ph } from '@/content/placeholder';

export const metadata: Metadata = createMetadata({ title: ph.metaTitle, description: ph.metaDescription, path: '/login' });

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">{ph.heading}</h1>
        <p className="mt-2 text-muted-foreground">{ph.body}</p>
      </div>
      <AuthForm mode="login" />
      <p className="text-center text-sm text-muted-foreground">
        {ph.short}{' '}
        <Link href={routes.register.href} className="font-medium text-primary hover:underline">
          {ph.cta}
        </Link>
      </p>
    </div>
  );
}
