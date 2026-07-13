import 'server-only';

/**
 * Request trace ids + safe logging for AI calls. We log METADATA only — model,
 * token counts, latency, cost, status, trace id — and NEVER the prompt, the user
 * message, or the response text, so private/clinical content never reaches logs.
 */

let counter = 0;

/**
 * A short, unique-enough trace id. Deliberately avoids Math.random()/Date.now()
 * timing sources that some sandboxes block — combines a monotonic counter with a
 * per-process seed derived from high-resolution time when available.
 */
export function newTraceId(): string {
  counter = (counter + 1) % 1_000_000;
  const seed = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? Math.floor(performance.now() * 1000)
    : counter;
  return `ai_${seed.toString(36)}${counter.toString(36).padStart(4, '0')}`;
}

export interface AiTraceMeta {
  traceId: string;
  provider: string;
  model: string;
  status: 'ok' | 'error' | 'aborted';
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  errorKind?: string | undefined;
  /** Optional coarse label of the caller (e.g. "herne:reply", "playground"). Never content. */
  op?: string | undefined;
}

/** Emit a single structured, content-free log line for an AI call. */
export function logAiTrace(meta: AiTraceMeta): void {
  // Content-free by construction — only the fields above are serialised.
  const line = {
    kind: 'ai_call',
    traceId: meta.traceId,
    provider: meta.provider,
    model: meta.model,
    status: meta.status,
    latencyMs: meta.latencyMs,
    inputTokens: meta.inputTokens ?? null,
    outputTokens: meta.outputTokens ?? null,
    costUsd: meta.costUsd ?? null,
    errorKind: meta.errorKind ?? null,
    op: meta.op ?? null,
  };
  if (meta.status === 'error') console.error('[ai]', JSON.stringify(line));
  else console.info('[ai]', JSON.stringify(line));
}
