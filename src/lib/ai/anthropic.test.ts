import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Provider tests run entirely against a MOCKED @anthropic-ai/sdk — no real,
 * paid API calls are ever made in the automated suite.
 */

// Controllable per-test behaviour for the mocked SDK.
let createImpl: (params: Record<string, unknown>, opts: Record<string, unknown>) => unknown;

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status: number | undefined;
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'APIError';
      this.status = status;
    }
  }
  class APIUserAbortError extends APIError {
    constructor() {
      super('aborted');
      this.name = 'APIUserAbortError';
    }
  }
  class APIConnectionTimeoutError extends APIError {
    constructor() {
      super('timeout');
      this.name = 'APIConnectionTimeoutError';
    }
  }
  class Anthropic {
    messages = { create: (p: Record<string, unknown>, o: Record<string, unknown>) => createImpl(p, o) };
    constructor(_opts: unknown) {}
    static APIError = APIError;
    static APIUserAbortError = APIUserAbortError;
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
  }
  return { default: Anthropic };
});

const { createAnthropicProvider } = await import('./anthropic');
const { AiProviderError } = await import('./provider');
const AnthropicMock = (await import('@anthropic-ai/sdk')).default as unknown as {
  APIError: new (m: string, s?: number) => Error;
};

function fakeMessage(text: string) {
  return { content: [{ type: 'text', text }], model: 'claude-sonnet-5', usage: { input_tokens: 100, output_tokens: 40 }, stop_reason: 'end_turn' };
}

async function* fakeStream(text: string) {
  yield { type: 'message_start', message: { model: 'claude-sonnet-5', usage: { input_tokens: 100, output_tokens: 0 } } };
  for (const ch of text.split(' ')) {
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: `${ch} ` } };
  }
  yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 40 } };
  yield { type: 'message_stop' };
}

beforeEach(() => {
  createImpl = () => fakeMessage('hello');
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('Anthropic provider — chat', () => {
  it('returns text, usage, model, estimated cost and a trace id on success', async () => {
    const p = createAnthropicProvider();
    const res = await p.chat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.text).toBe('hello');
    expect(res.model).toBe('claude-sonnet-5');
    expect(res.usage).toEqual({ inputTokens: 100, outputTokens: 40 });
    expect(res.costUsd).toBeGreaterThan(0);
    expect(res.traceId).toMatch(/^ai_/);
    expect(res.stopReason).toBe('end_turn');
  });

  it('classifies a 429 as a retryable rate_limit error', async () => {
    createImpl = () => {
      throw new AnthropicMock.APIError('rate', 429);
    };
    const p = createAnthropicProvider();
    await expect(p.chat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ kind: 'rate_limit', retryable: true });
  });

  it('classifies a 401 as a non-retryable auth error', async () => {
    createImpl = () => {
      throw new AnthropicMock.APIError('nope', 401);
    };
    const p = createAnthropicProvider();
    await expect(p.chat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ kind: 'auth', retryable: false });
  });

  it('maps a caller abort to an aborted error', async () => {
    createImpl = () => {
      const e = new Error('cancelled');
      e.name = 'AbortError';
      throw e;
    };
    const p = createAnthropicProvider();
    const err = await p.chat({ messages: [{ role: 'user', content: 'hi' }] }).catch((e) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect(err.kind).toBe('aborted');
  });

  it('retries once without temperature when the model rejects it', async () => {
    let calls = 0;
    createImpl = (params) => {
      calls += 1;
      if ('temperature' in params) throw new Error('temperature is deprecated for this model');
      return fakeMessage('recovered');
    };
    const p = createAnthropicProvider();
    const res = await p.chat({ messages: [{ role: 'user', content: 'hi' }], temperature: 0.5 });
    expect(res.text).toBe('recovered');
    expect(calls).toBe(2);
  });
});

describe('Anthropic provider — streaming', () => {
  it('yields text deltas then one terminal final chunk with usage + cost', async () => {
    createImpl = (params) => {
      expect(params.stream).toBe(true);
      return fakeStream('one two three');
    };
    const p = createAnthropicProvider();
    const deltas: string[] = [];
    let final: { text: string; usage: unknown; costUsd: number; traceId: string } | null = null;
    for await (const chunk of p.stream({ messages: [{ role: 'user', content: 'hi' }] })) {
      if (chunk.type === 'delta') deltas.push(chunk.text);
      else final = chunk.result;
    }
    expect(deltas.join('')).toBe('one two three ');
    expect(final).not.toBeNull();
    expect(final?.text).toBe('one two three ');
    expect(final?.usage).toEqual({ inputTokens: 100, outputTokens: 40 });
    expect(final?.costUsd).toBeGreaterThan(0);
    expect(final?.traceId).toMatch(/^ai_/);
  });
});

describe('Anthropic provider — safe logging', () => {
  it('never logs the prompt or response content', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    createImpl = () => fakeMessage('SECRET_RESPONSE_TEXT');
    const p = createAnthropicProvider();
    await p.chat({ system: 'SECRET_SYSTEM_PROMPT', messages: [{ role: 'user', content: 'SECRET_USER_MESSAGE' }] });
    const logged = info.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toContain('ai_call');
    expect(logged).not.toContain('SECRET_SYSTEM_PROMPT');
    expect(logged).not.toContain('SECRET_USER_MESSAGE');
    expect(logged).not.toContain('SECRET_RESPONSE_TEXT');
  });
});
