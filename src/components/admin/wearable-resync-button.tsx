'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminResyncWearableAction } from '@/services/wearable-actions';

/** Staff resync for one member's wearable connection — honest until credentialed. */
export function WearableResyncButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);

  return (
    <span className="flex items-center gap-2">
      {message && <span className={`text-xs ${isError ? 'text-danger' : 'text-secondary'}`}>{message}</span>}
      <Button
        type="button"
        intent="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await adminResyncWearableAction(userId);
            setIsError(!result.ok);
            setMessage(result.ok ? `Synced ${result.stored} new measurement(s).` : (result.error ?? 'Resync failed.'));
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />} Resync
      </Button>
    </span>
  );
}
