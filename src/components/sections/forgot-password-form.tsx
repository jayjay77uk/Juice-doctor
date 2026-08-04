'use client';

import * as React from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Request a password-reset email. Uses the browser Supabase client (anon key,
 * RLS-safe); the emailed link returns the person to /reset-password where they
 * choose a new password. Never reveals whether an email exists.
 */
export function ForgotPasswordForm({ authReal }: { authReal: boolean }) {
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!authReal) {
      // Preview mode — no email provider; show the honest confirmation state.
      setSent(true);
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Always confirm — never reveal whether an account exists.
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-green-100 text-secondary">
          <MailCheck className="size-6" />
        </span>
        <p className="font-medium text-foreground">Check your email</p>
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium">{email.trim()}</span>, a reset link is on
          its way. The link expires after a short time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Field label="Email" name="email" required error={error ?? undefined}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </Field>
      <Button type="submit" full disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Send reset link
      </Button>
    </form>
  );
}
