/**
 * Available AI models — DATA, selectable per agent. In production this is the
 * `ai_models` table (migration 0009) populated per provider; the admin never
 * hardcodes a model. Listed here so the prototype's model picker is populated.
 * Defaults reflect the latest Claude family.
 */

export interface ModelOption {
  id: string;
  modelKey: string;
  label: string;
  provider: string;
  contextWindow: number;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'model_opus_48', modelKey: 'claude-opus-4-8', label: 'Claude Opus 4.8', provider: 'anthropic', contextWindow: 200000 },
  { id: 'model_sonnet_5', modelKey: 'claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'anthropic', contextWindow: 200000 },
  { id: 'model_haiku_45', modelKey: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', contextWindow: 200000 },
];
