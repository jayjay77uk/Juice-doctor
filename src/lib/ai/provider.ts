/**
 * Provider-neutral AI interface. Domain code (the HERNE orchestration engine)
 * depends on THIS, never on a concrete SDK, so another provider can be added later
 * without rewriting orchestration. When no provider is configured or a call fails,
 * callers get a typed failure — the app shows an honest "AI unavailable" state and
 * NEVER fabricates an answer.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  tools?: { name: string; description: string; input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean } }[];
  toolMessages?: { role: 'user' | 'assistant'; content: unknown[] | string }[];
  system?: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Cancels an in-flight request (streaming or not). */
  signal?: AbortSignal;
  /** Coarse caller label for trace logs (never content), e.g. "herne:reply". */
  op?: string;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AiChatResult {
  toolCalls?: { id: string; name: string; input: unknown }[];
  contentBlocks?: unknown[];
  text: string;
  model: string;
  usage: AiUsage | null;
  /** Wall-clock latency of the provider call in ms. */
  latencyMs: number;
  /** Estimated USD cost from token usage (never billed; 0 when usage unknown). */
  costUsd: number;
  /** Correlation id for safe logging + persistence. */
  traceId: string;
  /** Provider stop reason where available (e.g. "end_turn", "max_tokens"). */
  stopReason: string | null;
}

/** A streamed chunk: incremental text, then exactly one terminal `final`. */
export type AiStreamChunk =
  | { type: 'delta'; text: string }
  | { type: 'final'; result: AiChatResult };

/** Categorised failure so callers/retries can reason about the cause. */
export type AiErrorKind =
  | 'timeout'
  | 'rate_limit'
  | 'overloaded'
  | 'auth'
  | 'invalid_request'
  | 'server'
  | 'aborted'
  | 'unknown';

/** Thrown when no provider is configured — surfaced as a service-unavailable state. */
export class AiUnavailableError extends Error {
  constructor(message = 'The AI service is not configured.') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

/** Thrown when the provider is configured but the call failed (timeout, 5xx, etc.). */
export class AiProviderError extends Error {
  override readonly cause: unknown;
  readonly kind: AiErrorKind;
  readonly status: number | null;
  readonly retryable: boolean;
  readonly traceId: string | null;
  constructor(
    message: string,
    opts: { kind?: AiErrorKind; status?: number | null; retryable?: boolean; traceId?: string | null; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'AiProviderError';
    this.kind = opts.kind ?? 'unknown';
    this.status = opts.status ?? null;
    this.retryable = opts.retryable ?? false;
    this.traceId = opts.traceId ?? null;
    this.cause = opts.cause;
  }
}

export interface AiProvider {
  readonly name: string;
  /** Single-turn / multi-turn completion. */
  chat(req: AiChatRequest): Promise<AiChatResult>;
  /** Streamed completion — yields text deltas then one terminal `final` chunk. */
  stream(req: AiChatRequest): AsyncIterable<AiStreamChunk>;
  /**
   * Structured output validated by a caller-supplied parser (typically a zod
   * `safeParse`). Retries once on invalid JSON, then throws AiProviderError.
   */
  structured<T>(req: AiChatRequest, parse: (value: unknown) => { ok: true; value: T } | { ok: false; error: string }): Promise<T>;
}
