'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Check, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Stage = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * Set a new password after arriving from a reset email. The emailed link carries a
 * one-time code; we exchange it for a recovery session, then update the password.
 * An expired/invalid link shows an honest state with a way to request a new one.
 */
export function ResetPasswordForm() {
  const [stage, setStage] = React.useState<Stage>('checking');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function establish() {
      try {
        const supabase = createSupabaseBrowserClient();
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!cancelled) setStage(exchangeError ? 'invalid' : 'ready');
          return;
        }
        // Older-style links land with tokens in the hash and the SDK picks the
        // session up itself — just confirm one exists.
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setStage(data.session ? 'ready' : 'invalid');
      } catch {
        if (!cancelled) setStage('invalid');
      }
    }
    establish();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Please choose a password of at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('Could not update the password. Your link may have expired — request a new one.');
      } else {
        setStage('done');
      }
    } catch {
      setError('Could not update the password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (stage === 'checking') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking your reset link…
      </div>
    );
  }

  if (stage === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-accent-strong">
          <TriangleAlert className="size-6" />
        </span>
        <p className="font-medium text-foreground">This link is invalid or has expired</p>
        <p className="text-sm text-muted-foreground">Reset links only work once and expire quickly.</p>
        <Button asChild className="mt-1">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-green-100 text-secondary">
          <Check className="size-6" />
        </span>
        <p className="font-medium text-foreground">Password updated</p>
        <p className="text-sm text-muted-foreground">You can now log in with your new password.</p>
        <Button asChild className="mt-1">
          <Link href="/login">Go to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Field label="New password" name="password" required error={error ?? undefined}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </Field>
      <Field label="Confirm new password" name="confirm" required>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <Button type="submit" full disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Set new password
      </Button>
    </form>
  );
}
