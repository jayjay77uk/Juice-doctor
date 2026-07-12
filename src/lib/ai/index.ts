import 'server-only';

import { isAiConfigured } from '@/lib/env';
import { createAnthropicProvider } from './anthropic';
import { type AiProvider, AiUnavailableError } from './provider';

export * from './provider';

let cached: AiProvider | null = null;

/** The configured AI provider, or null when no credential is present. */
export function getAiProvider(): AiProvider | null {
  if (!isAiConfigured()) return null;
  if (!cached) cached = createAnthropicProvider();
  return cached;
}

/** The AI provider, or throw AiUnavailableError (callers render an honest state). */
export function requireAiProvider(): AiProvider {
  const provider = getAiProvider();
  if (!provider) throw new AiUnavailableError();
  return provider;
}

export { isAiConfigured };
