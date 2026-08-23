'use client';

import { useState, useTransition } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { startSelfieScanAction } from '@/services/selfie-scan/actions';
import { Button } from '@/components/ui/button';

export function SelfieScanLaunchCard({ configured, provider }: { configured: boolean; provider: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startSelfieScanAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign(result.launchUrl);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-muted px-6 py-8 text-center">
      <Camera className="mx-auto size-8 text-primary" />
      <p className="mt-3 font-serif text-xl text-foreground">
        {configured ? 'Remote Selfie Scan is ready to start.' : 'Remote Selfie Scan provider not connected.'}
      </p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        {configured
          ? `Your scan will open securely with ${provider ?? 'the configured provider'} and return here when complete.`
          : 'The application lifecycle, secure session storage and verified webhook endpoint are built. A scan cannot start until an approved provider contract and credentials are connected.'}
      </p>
      <div className="mt-5">
        <Button type="button" onClick={start} disabled={!configured || pending}>
          {pending ? 'Starting scan…' : 'Start Remote Selfie Scan'}
        </Button>
      </div>
      {error ? <p className="mx-auto mt-3 flex max-w-lg items-center justify-center gap-2 text-sm text-danger"><AlertCircle className="size-4" /> {error}</p> : null}
    </div>
  );
}
