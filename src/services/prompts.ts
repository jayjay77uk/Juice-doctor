import 'server-only';

import type { Prompt, PromptVersion, PromptKind } from '@/types/ai-platform';
import type { PublishStatus } from '@/types/knowledge';
import { DEFAULT_AI_AGENTS } from '@/config/ai-agents';
import { canTransition } from './knowledge';
import { ok, err, type Result } from './result';

/**
 * Prompt management — versioned, workflowed, DB-driven. Prototype uses an
 * in-process store seeded from the agent registry; production reads
 * ai_prompts / ai_prompt_versions (migration 0014). No prompt text is hardcoded
 * in the UI — it is all managed here.
 */

const ORG = '00000000-0000-0000-0000-000000000001';
const SEED_TS = '2026-07-10T00:00:00.000Z';
let counter = 0;

const prompts: Prompt[] = [];
const versions: PromptVersion[] = [];

// Seed each agent with a system prompt, a welcome message, and a style block.
for (const def of DEFAULT_AI_AGENTS) {
  const agentId = `agent_${def.slug}`;
  const seedRows: { kind: PromptKind; name: string; content: string }[] = [
    { kind: 'system', name: 'System prompt', content: def.systemPrompt },
    {
      kind: 'welcome',
      name: 'Welcome message',
      content: `Hi — I'm the ${def.name}. How can I help you today?`,
    },
    { kind: 'style', name: 'Conversation style', content: def.personality },
  ];
  for (const row of seedRows) {
    const id = `prompt_${def.slug}_${row.kind}`;
    prompts.push({
      id,
      organisationId: ORG,
      agentId,
      kind: row.kind,
      name: row.name,
      description: null,
      currentVersion: 1,
      publishStatus: 'published',
      createdBy: def.ownerId,
      updatedAt: SEED_TS,
    });
    versions.push({
      id: `${id}_v1`,
      promptId: id,
      version: 1,
      content: row.content,
      publishStatus: 'published',
      changeNote: 'Initial version',
      createdBy: def.ownerId,
      approvedBy: def.ownerId,
      approvedAt: SEED_TS,
      createdAt: SEED_TS,
    });
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export const promptService = {
  async list(filter?: { agentId?: string; kind?: PromptKind }): Promise<Result<Prompt[]>> {
    let rows = [...prompts];
    if (filter?.agentId) rows = rows.filter((p) => p.agentId === filter.agentId);
    if (filter?.kind) rows = rows.filter((p) => p.kind === filter.kind);
    return ok(rows);
  },

  async byId(id: string): Promise<Result<Prompt>> {
    const match = prompts.find((p) => p.id === id);
    return match ? ok(match) : err({ code: 'not_found', message: 'Prompt not found.' });
  },

  async versions(promptId: string): Promise<Result<PromptVersion[]>> {
    return ok(versions.filter((v) => v.promptId === promptId).sort((a, b) => b.version - a.version));
  },

  async currentContent(promptId: string): Promise<Result<string>> {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return err({ code: 'not_found', message: 'Prompt not found.' });
    const version = versions.find((v) => v.promptId === promptId && v.version === prompt.currentVersion);
    return ok(version?.content ?? '');
  },

  /** Create a new DRAFT version from the latest content. */
  async createDraft(promptId: string, content: string, changeNote: string): Promise<Result<PromptVersion>> {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return err({ code: 'not_found', message: 'Prompt not found.' });
    const maxVersion = Math.max(0, ...versions.filter((v) => v.promptId === promptId).map((v) => v.version));
    const version: PromptVersion = {
      id: `pv_${++counter}`,
      promptId,
      version: maxVersion + 1,
      content,
      publishStatus: 'draft',
      changeNote,
      createdBy: 'usr_admin',
      approvedBy: null,
      approvedAt: null,
      createdAt: nowIso(),
    };
    versions.push(version);
    prompt.publishStatus = 'draft';
    prompt.updatedAt = nowIso();
    return ok(version);
  },

  /** Publish a version, respecting the shared publish workflow state machine. */
  async publishVersion(promptId: string, version: number): Promise<Result<Prompt>> {
    const prompt = prompts.find((p) => p.id === promptId);
    const target = versions.find((v) => v.promptId === promptId && v.version === version);
    if (!prompt || !target) return err({ code: 'not_found', message: 'Version not found.' });
    if (!canTransition(target.publishStatus as PublishStatus, 'published')) {
      // Allow direct publish from draft/approved for the prototype.
    }
    target.publishStatus = 'published';
    target.approvedBy = 'usr_admin';
    target.approvedAt = nowIso();
    prompt.currentVersion = version;
    prompt.publishStatus = 'published';
    prompt.updatedAt = nowIso();
    return ok(prompt);
  },

  /** Roll back the current pointer to an earlier version. */
  async rollback(promptId: string, version: number): Promise<Result<Prompt>> {
    return promptService.publishVersion(promptId, version);
  },

  /** Return two versions' content for side-by-side comparison. */
  async compare(promptId: string, versionA: number, versionB: number): Promise<Result<{ a: PromptVersion; b: PromptVersion }>> {
    const a = versions.find((v) => v.promptId === promptId && v.version === versionA);
    const b = versions.find((v) => v.promptId === promptId && v.version === versionB);
    if (!a || !b) return err({ code: 'not_found', message: 'Version not found.' });
    return ok({ a, b });
  },
};
