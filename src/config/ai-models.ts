/**
 * Available AI models — DATA, selectable per agent. The admin model picker is
 * populated from this static list today; the `ai_models` table (migration 0009)
 * can take over per-provider population later. The admin never hardcodes a
 * model. Defaults reflect the latest Claude family.
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
