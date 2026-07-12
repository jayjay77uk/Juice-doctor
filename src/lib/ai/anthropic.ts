import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import {
  type AiProvider,
  type AiChatRequest,
  type AiChatResult,
  AiProviderError,
} from './provider';

/**
 * Anthropic implementation of the provider-neutral AiProvider. Reads the
 * server-only ANTHROPIC_API_KEY. Applies a request timeout + one retry. Never
 * returns fabricated content — on failure it throws AiProviderError so callers
 * render an honest unavailable state.
 */

const DEFAULT_MAX_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 30_000;

function firstText(content: Anthropic.Messages.ContentBlock[]): string {
  const block = content.find((b): b is Anthropic.Messages.TextBlock => b.type === 'text');
  return block?.text ?? '';
}

export function createAnthropicProvider(): AiProvider {
  const client = new Anthropic({ apiKey: env.anthropicApiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });

  async function chat(req: AiChatRequest): Promise<AiChatResult> {
    const model = req.model ?? env.aiModel;
    try {
      const res = await client.messages.create({
        model,
        max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        ...(req.system ? { system: req.system } : {}),
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return {
        text: firstText(res.content),
        model: res.model,
        usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
      };
    } catch (cause) {
      throw new AiProviderError('The AI provider request failed.', cause);
    }
  }

  async function structured<T>(
    req: AiChatRequest,
    parse: (value: unknown) => { ok: true; value: T } | { ok: false; error: string },
  ): Promise<T> {
    const jsonSystem = `${req.system ?? ''}\n\nRespond with ONLY a single valid JSON object and no prose, code fences, or commentary.`.trim();
    let lastError = 'no response';
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await chat({ ...req, system: jsonSystem });
      const text = result.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      try {
        const parsed = parse(JSON.parse(text));
        if (parsed.ok) return parsed.value;
        lastError = parsed.error;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'invalid JSON';
      }
    }
    throw new AiProviderError(`The AI returned invalid structured output: ${lastError}`);
  }

  return { name: 'anthropic', chat, structured };
}
