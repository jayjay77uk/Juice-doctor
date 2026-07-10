/**
 * Shared result shapes for the data layer. These are plain types (no
 * `server-only`) so client form components can import `ActionResult` for typing.
 */

export interface ServiceError {
  code: 'not_found' | 'unavailable' | 'invalid';
  message: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

/** A page of results. `nextCursor` is null when there are no more. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Standard shape returned by every Server Action, consumed via `useActionState`. */
export type ActionResult =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | {
      status: 'error';
      message: string;
      /** Field-level validation errors keyed by input name. */
      fieldErrors?: Record<string, string[]>;
    };

export const idleAction: ActionResult = { status: 'idle' };

/** Convenience constructors keep action bodies terse and consistent. */
export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (error: ServiceError): Result<never> => ({ ok: false, error });
