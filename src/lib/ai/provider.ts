/**
 * Provider-neutral AI interface. Domain code depends on THIS, never on a
 * concrete SDK, so the provider is swappable via configuration. When no provider
 * is configured or the provider errors, callers get a typed failure — the app
 * shows an honest "AI unavailable" state and NEVER fabricates an answer.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  system?: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AiChatResult {
  text: string;
  model: string;
  usage: AiUsage | null;
}

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
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AiProviderError';
    this.cause = cause;
  }
}

export interface AiProvider {
  readonly name: string;
  /** Single-turn / multi-turn completion. */
  chat(req: AiChatRequest): Promise<AiChatResult>;
  /**
   * Structured output validated by a caller-supplied parser (typically a zod
   * `safeParse`). Retries once on invalid JSON, then throws AiProviderError.
   */
  structured<T>(req: AiChatRequest, parse: (value: unknown) => { ok: true; value: T } | { ok: false; error: string }): Promise<T>;
}
