import 'server-only';

import { promptsRepo } from './repositories/prompts-repo';

/**
 * Prompt registry — versioned prompts with a publish workflow over ai_prompts +
 * ai_prompt_versions (migration 0014). Publishing a version here is exactly what
 * the runtime prompt assembler reads at inference time. No mock data.
 */

export const promptService = promptsRepo;
