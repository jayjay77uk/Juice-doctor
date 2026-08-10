'use client';

import * as React from 'react';
import { Loader2, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { connectWearableAction, disconnectWearableAction } from '@/services/wearable-actions';

/**
 * Member wearable connection controls. Connect is honestly disabled until the
 * device provider is credentialed; Disconnect is always real — it revokes
 * consent and deletes the member's stored wearable data.
 */
export function WearableConnectionControls({ status, providerConfigured }: { status: string | null; providerConfigured: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const hasConnection = status === 'active' || status === 'pending';

  function connect() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await connectWearableAction();
      if (!result.ok) {
        setError(result.error ?? 'Connection is not available right now.');
        return;
      }
      if (result.authorisationUrl) {
        window.location.assign(result.authorisationUrl);
      } else {
        setNotice('Connection started — follow the provider authorisation to finish.');
      }
    });
  }

  function disconnect() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await disconnectWearableAction();
      if (!result.ok) {
        setError(result.error ?? 'Disconnect failed — please try again.');
        return;
      }
      setConfirming(false);
      setNotice(`Disconnected. Consent revoked and ${result.deleted} stored measurement(s) deleted.`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-secondary" role="status">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!hasConnection && (
          <Button
            type="button"
            size="sm"
            onClick={connect}
            disabled={pending || !providerConfigured}
            title={providerConfigured ? undefined : 'Device connections open once the wearable provider is configured.'}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Connect a device
          </Button>
        )}
        {hasConnection &&
          (confirming ? (
            <>
              <Button type="button" size="sm" onClick={disconnect} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Yes — disconnect and delete my data
              </Button>
              <Button type="button" intent="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
                Keep connected
              </Button>
            </>
          ) : (
            <Button type="button" intent="outline" size="sm" onClick={() => setConfirming(true)} disabled={pending}>
              <Unlink className="size-4" /> Disconnect
            </Button>
          ))}
      </div>
      {!providerConfigured && !hasConnection && (
        <p className="text-xs text-muted-foreground">
          Wearable connections are not available yet — the device provider (Thryve) is not connected. This button activates as soon as it is configured.
        </p>
      )}
      {hasConnection && (
        <p className="text-xs text-muted-foreground">Disconnecting revokes your sharing consent and permanently deletes your stored wearable data.</p>
      )}
    </div>
  );
}
