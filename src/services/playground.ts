import 'server-only';

import type { PlaygroundResult, AiRunLog, RetrievedChunk } from '@/types/ai-platform';
import { ok, type Result } from './result';

/**
 * AI Playground service — a MOCK harness for testing agents/prompts without any
 * production impact. NO real inference runs: the response is templated and the
 * metrics are simulated. Production replaces `run()` with a real, isolated
 * inference call (is_playground=true) that never touches production analytics.
 */

const SAMPLE_CHUNKS: RetrievedChunk[] = [
  {
    documentTitle: 'The HERNE Protocol — Overview',
    snippet:
      'HERNE connects Hydration, Elimination, Rest, Nutrition and Exercise into one system, sequenced to the individual…',
    score: 0.91,
  },
  {
    documentTitle: 'Cellular Hydration Explained',
    snippet:
      'True cellular hydration is the difference between fluid passing through you and water reaching your cells…',
    score: 0.86,
  },
  {
    documentTitle: 'Nutrient Density vs Restriction',
    snippet: 'Food is information. Nutrient density beats restriction for sustainable change…',
    score: 0.79,
  },
];

const runLogs: AiRunLog[] = [];
let counter = 0;

function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

export const playground = {
  /**
   * Run a mock query against an agent + prompt version + knowledge sources.
   * Returns a templated answer, simulated retrieved knowledge, and metrics.
   */
  async run(input: {
    agentId: string;
    promptVersionId?: string;
    query: string;
    knowledgeCount?: number;
    modelKey?: string;
  }): Promise<Result<PlaygroundResult>> {
    const retrieved = SAMPLE_CHUNKS.slice(0, input.knowledgeCount ?? 2);
    const output = [
      `Here's how I'd approach that, grounded in the HERNE Protocol:`,
      ``,
      `• Start with hydration — most fatigue and cravings trace back to being under-watered.`,
      `• Look at rest next; recovery is where change actually happens.`,
      ``,
      `(Prototype: this is a simulated response — no AI model was called. In production this agent would answer using its published prompt and the retrieved knowledge shown alongside.)`,
    ].join('\n');
    const tokensInput = estimateTokens(input.query) + 320; // + system/prompt overhead
    const tokensOutput = estimateTokens(output);
    const latencyMs = 640 + (input.query.length % 400);
    const result: PlaygroundResult = {
      output,
      retrievedKnowledge: retrieved,
      tokensInput,
      tokensOutput,
      latencyMs,
      modelKey: input.modelKey ?? 'claude-opus-4-8',
    };
    runLogs.unshift({
      id: `run_${++counter}`,
      agentId: input.agentId,
      promptVersionId: input.promptVersionId ?? null,
      actorId: 'usr_admin',
      isPlayground: true,
      input: input.query,
      output,
      retrievedKnowledge: retrieved,
      tokensInput,
      tokensOutput,
      latencyMs,
      status: 'ok',
      createdAt: new Date().toISOString(),
    });
    return ok(result);
  },

  async logs(limit = 25): Promise<Result<AiRunLog[]>> {
    return ok(runLogs.slice(0, limit));
  },
};
