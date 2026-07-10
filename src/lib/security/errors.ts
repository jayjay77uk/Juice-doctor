/**
 * Typed application errors + safe serialisation.
 *
 * Every error carries a stable `code`, an HTTP `status`, and a `safeMessage` that
 * is guaranteed to contain no internal detail — so it can be shown to users or
 * returned from an API without leaking stack traces, SQL, or PII. Internal
 * `message`/`cause` stay server-side for logging only.
 */

export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'payload_too_large'
  | 'unsupported_media'
  | 'internal';

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  unsupported_media: 415,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** User-safe message. Never include secrets, IDs, SQL, or stack detail here. */
  readonly safeMessage: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    safeMessage: string,
    options?: { message?: string; details?: Record<string, unknown>; cause?: unknown },
  ) {
    super(options?.message ?? safeMessage, options?.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.status = STATUS[code];
    this.safeMessage = safeMessage;
    if (options?.details) this.details = options.details;
  }

  /** The shape safe to send to a client. */
  toClient(): { code: ErrorCode; message: string; details?: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.safeMessage,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export class AuthenticationError extends AppError {
  constructor(safeMessage = 'You need to sign in to continue.') {
    super('unauthenticated', safeMessage);
  }
}

export class AuthorizationError extends AppError {
  constructor(safeMessage = 'You do not have permission to do that.') {
    super('forbidden', safeMessage);
  }
}

export class NotFoundError extends AppError {
  constructor(safeMessage = 'That could not be found.') {
    super('not_found', safeMessage);
  }
}

export class ValidationError extends AppError {
  constructor(safeMessage = 'Please check the highlighted fields.', details?: Record<string, unknown>) {
    super('validation', safeMessage, details ? { details } : undefined);
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, safeMessage = 'Too many requests. Please slow down.') {
    super('rate_limited', safeMessage, { details: { retryAfterSeconds } });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Normalise any thrown value into an AppError without leaking internals. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  return new AppError('internal', 'Something went wrong. Please try again.', {
    message: err instanceof Error ? err.message : String(err),
    cause: err,
  });
}
