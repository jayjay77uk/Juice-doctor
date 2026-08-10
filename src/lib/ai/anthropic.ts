import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import {
  type AiProvider,
  type AiChatRequest,
  type AiChatResult,
  type AiStreamChunk,
  type AiErrorKind,
  AiProviderError,
} from './provider';
import { estimateCostUsd } from './pricing';
import { newTraceId, logAiTrace } from './trace';

/**
 * Anthropic implementation of the provider-neutral AiProvider. Reads the
 * server-only ANTHROPIC_API_KEY. Applies a configurable timeout, provider-level
 * retries with backoff (rate-limit / overload / 5xx), request cancellation via
 * AbortSignal, and structured error classification. Captures token usage, latency,
 * estimated cost and a trace id on every call, and logs METADATA only (never the
 * prompt or response text). Never fabricates content — on failure it throws
 * AiProviderError so callers render an honest unavailable state.
 */

const DEFAULT_MAX_TOKENS = env.aiMaxOutputTokens;
const REQUEST_TIMEOUT_MS = env.aiRequestTimeoutMs;
const MAX_RETRIES = 2;
// The SDK's timeout is PER ATTEMPT; our outer timer bounds TOTAL wall time.
// It must leave room for the SDK's automatic retries (429/overload/5xx) or
// they can never run — bound total at attempts × per-attempt + backoff slack.
const TOTAL_TIMEOUT_MS = REQUEST_TIMEOUT_MS * (MAX_RETRIES + 1) + 5_000;

function firstText(content: Anthropic.Messages.ContentBlock[]): string {
  const block = content.find((b): b is Anthropic.Messages.TextBlock => b.type === 'text');
  return block?.text ?? '';
}

/** Newer models (e.g. claude-sonnet-5) reject the `temperature` parameter. */
function mentionsTemperature(cause: unknown): boolean {
  const msg = cause instanceof Error ? cause.message : String(cause ?? '');
  return /temperature/i.test(msg);
}

/**
 * Map an SDK/transport error to our typed, categorised provider error.
 * `timedOut` distinguishes OUR timeout timer firing from a genuine caller
 * cancellation — both surface from the SDK as APIUserAbortError because the
 * timer aborts the merged signal, but a timeout is retryable and a user
 * cancellation is not.
 */
export function classify(cause: unknown, traceId: string, timedOut = false): AiProviderError {
  const status = cause instanceof Anthropic.APIError ? cause.status ?? null : null;
  const name = cause instanceof Error ? cause.name : '';
  let kind: AiErrorKind = 'unknown';
  let retryable = false;

  if (timedOut && (cause instanceof Anthropic.APIUserAbortError || name === 'AbortError' || name === 'TimeoutError')) {
    kind = 'timeout';
    retryable = true;
  } else if (cause instanceof Anthropic.APIUserAbortError || name === 'AbortError') {
    kind = 'aborted';
  } else if (cause instanceof Anthropic.APIConnectionTimeoutError || /timeout/i.test(name)) {
    kind = 'timeout';
    retryable = true;
  } else if (status === 401 || status === 403) {
    kind = 'auth';
  } else if (status === 429) {
    kind = 'rate_limit';
    retryable = true;
  } else if (status === 529) {
    kind = 'overloaded';
    retryable = true;
  } else if (status != null && status >= 500) {
    kind = 'server';
    retryable = true;
  } else if (status != null && status >= 400) {
    kind = 'invalid_request';
  }

  const messages: Record<AiErrorKind, string> = {
    timeout: 'The AI provider timed out. Please try again.',
    rate_limit: 'The AI provider is rate limiting requests. Please try again shortly.',
    overloaded: 'The AI provider is temporarily overloaded. Please try again shortly.',
    auth: 'The AI provider rejected the credentials.',
    invalid_request: 'The AI request was invalid.',
    server: 'The AI provider had a server error. Please try again.',
    aborted: 'The request was cancelled.',
    unknown: 'The AI provider request failed.',
  };
  return new AiProviderError(messages[kind], { kind, status, retryable, traceId, cause });
}

/**
 * Combine the caller's signal with a timeout into one signal + cleanup.
 * `timedOut()` reports whether the TIMER (not the caller) caused the abort,
 * so errors can be classified as timeout (retryable) vs aborted (not).
 */
export function withTimeout(signal: AbortSignal | undefined, ms: number): { signal: AbortSignal; cleanup: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  let timerFired = false;
  const onAbort = () => controller.abort((signal as AbortSignal | undefined)?.reason);
  const timer = setTimeout(() => {
    // If the caller already aborted, this is not a timeout — don't claim it.
    if (controller.signal.aborted) return;
    timerFired = true;
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, ms);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    timedOut: () => timerFired,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

export function createAnthropicProvider(): AiProvider {
  const client = new Anthropic({ apiKey: env.anthropicApiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES });

  function baseParams(req: AiChatRequest): Anthropic.Messages.MessageCreateParamsNonStreaming {
    return {
      model: req.model ?? env.aiModel,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(req.system ? { system: req.system } : {}),
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    };
  }

  async function chat(req: AiChatRequest): Promise<AiChatResult> {
    const traceId = newTraceId();
    const started = Date.now();
    const model = req.model ?? env.aiModel;
    const { signal, cleanup, timedOut } = withTimeout(req.signal, TOTAL_TIMEOUT_MS);
    const base = baseParams(req);
    try {
      let res: Anthropic.Messages.Message;
      try {
        const params = req.temperature !== undefined ? { ...base, temperature: req.temperature } : base;
        res = await client.messages.create(params, { signal });
      } catch (cause) {
        // Some models reject `temperature`; retry once without it before failing.
        if (req.temperature !== undefined && mentionsTemperature(cause)) {
          res = await client.messages.create(base, { signal });
        } else {
          throw cause;
        }
      }
      const usage = { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
      const costUsd = estimateCostUsd(res.model, usage);
      const latencyMs = Date.now() - started;
      logAiTrace({ traceId, provider: 'anthropic', model: res.model, status: 'ok', latencyMs, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costUsd, op: req.op });
      return { text: firstText(res.content), model: res.model, usage, latencyMs, costUsd, traceId, stopReason: res.stop_reason ?? null };
    } catch (cause) {
      const err = classify(cause, traceId, timedOut());
      logAiTrace({ traceId, provider: 'anthropic', model, status: err.kind === 'aborted' ? 'aborted' : 'error', latencyMs: Date.now() - started, errorKind: err.kind, op: req.op });
      throw err;
    } finally {
      cleanup();
    }
  }

  async function* stream(req: AiChatRequest): AsyncIterable<AiStreamChunk> {
    const traceId = newTraceId();
    const started = Date.now();
    const model = req.model ?? env.aiModel;
    const { signal, cleanup, timedOut } = withTimeout(req.signal, TOTAL_TIMEOUT_MS);
    const base = baseParams(req);
    let inputTokens = 0;
    let outputTokens = 0;
    let stopReason: string | null = null;
    let resolvedModel = model;
    let text = '';
    try {
      const params: Anthropic.Messages.MessageCreateParamsStreaming =
        req.temperature !== undefined ? { ...base, temperature: req.temperature, stream: true } : { ...base, stream: true };
      let events: AsyncIterable<Anthropic.Messages.RawMessageStreamEvent>;
      try {
        events = await client.messages.create(params, { signal });
      } catch (cause) {
        if (req.temperature !== undefined && mentionsTemperature(cause)) {
          events = await client.messages.create({ ...base, stream: true }, { signal });
        } else {
          throw cause;
        }
      }
      for await (const event of events) {
        if (event.type === 'message_start') {
          inputTokens = event.message.usage.input_tokens;
          resolvedModel = event.message.model || model;
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text;
          yield { type: 'delta', text: event.delta.text };
        } else if (event.type === 'message_delta') {
          outputTokens = event.usage.output_tokens;
          stopReason = event.delta.stop_reason ?? stopReason;
        }
      }
      const usage = { inputTokens, outputTokens };
      const costUsd = estimateCostUsd(resolvedModel, usage);
      const latencyMs = Date.now() - started;
      logAiTrace({ traceId, provider: 'anthropic', model: resolvedModel, status: 'ok', latencyMs, inputTokens, outputTokens, costUsd, op: req.op });
      yield { type: 'final', result: { text, model: resolvedModel, usage, latencyMs, costUsd, traceId, stopReason } };
    } catch (cause) {
      const err = classify(cause, traceId, timedOut());
      logAiTrace({ traceId, provider: 'anthropic', model, status: err.kind === 'aborted' ? 'aborted' : 'error', latencyMs: Date.now() - started, errorKind: err.kind, op: req.op });
      throw err;
    } finally {
      cleanup();
    }
  }

  async function structured<T>(
    req: AiChatRequest,
    parse: (value: unknown) => { ok: true; value: T } | { ok: false; error: string },
  ): Promise<T> {
    const jsonSystem = `${req.system ?? ''}\n\nRespond with ONLY a single valid JSON object and no prose, code fences, or commentary.`.trim();
    let lastError = 'no response';
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await chat({ ...req, system: jsonSystem, op: req.op ?? 'structured' });
      const text = result.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      try {
        const parsed = parse(JSON.parse(text));
        if (parsed.ok) return parsed.value;
        lastError = parsed.error;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'invalid JSON';
      }
    }
    throw new AiProviderError(`The AI returned invalid structured output: ${lastError}`, { kind: 'invalid_request' });
  }

  return { name: 'anthropic', chat, stream, structured };
}
