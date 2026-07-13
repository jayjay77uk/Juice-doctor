import { ShieldAlert } from 'lucide-react';
import { PROTOTYPE_NOTICES, config } from '@/config/app';

/**
 * The standing prototype notices, rendered as a compact list. Used in the
 * authenticated app shell footer and the /disclaimer page so every surface shows
 * the same honest wording (emergency, no patient data, simulated wearable, voice
 * planned, AI-generated language). Hidden in production mode.
 */
export function PrototypeNotices({ className }: { className?: string }) {
  if (!config.isPrototype) return null;
  return (
    <div className={`rounded-xl border border-border bg-surface-muted/60 px-4 py-3 ${className ?? ''}`}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ShieldAlert className="size-4 text-amber-500" /> Prototype notices
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {PROTOTYPE_NOTICES.map((n) => (
          <li key={n} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500" />
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}
