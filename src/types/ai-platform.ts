import type { AppRole } from '@/lib/auth/roles';
import type { PublishStatus } from './knowledge';

/**
 * AI platform-management model (Phase 3) — mirrors migration 0014. Prompts,
 * safety policies, analytics and run logs. Everything here is DATA edited from
 * the admin dashboard; nothing about agent behaviour is hardcoded.
 */

export type PromptKind =
  | 'system'
  | 'developer'
  | 'instruction'
  | 'behaviour'
  | 'restriction'
  | 'safety'
  | 'style'
  | 'welcome';

export const PROMPT_KIND_LABELS: Record<PromptKind, string> = {
  system: 'System prompt',
  developer: 'Developer prompt',
  instruction: 'Instruction block',
  behaviour: 'Behaviour rules',
  restriction: 'Restrictions',
  safety: 'Safety directives',
  style: 'Conversation style',
  welcome: 'Welcome message',
};

export interface Prompt {
  id: string;
  organisationId: string;
  agentId: string | null;
  kind: PromptKind;
  name: string;
  description: string | null;
  currentVersion: number;
  publishStatus: PublishStatus;
  createdBy: string | null;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  publishStatus: PublishStatus;
  changeNote: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface SafetyPolicy {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  allowedTopics: string[];
  restrictedTopics: string[];
  medicalBoundaries: string[];
  emergencyResponses: Record<string, string>;
  contentFilters: Record<string, unknown>;
  escalationRules: Record<string, unknown>;
  roleRestrictions: AppRole[];
  confidenceThreshold: number;
  humanEscalation: boolean;
  status: 'draft' | 'active' | 'archived' | 'deleted';
  updatedAt: string;
}

export interface KnowledgeCollection {
  id: string;
  organisationId: string;
  slug: string;
  name: string;
  description: string | null;
  documentCount: number;
  status: 'draft' | 'active' | 'archived' | 'deleted';
  updatedAt: string;
}

export type AnalyticsEventType =
  | 'conversation_started'
  | 'message_sent'
  | 'knowledge_retrieved'
  | 'feedback_given'
  | 'escalated'
  | 'agent_run'
  | 'token_usage';

export interface AnalyticsDailyPoint {
  day: string;
  conversations: number;
  messages: number;
  activeUsers: number;
  escalations: number;
  tokensInput: number;
  tokensOutput: number;
  costMicros: number;
  avgLatencyMs: number;
  satisfaction: number | null;
}

/** Aggregated headline metrics for the analytics dashboard. */
export interface AnalyticsSummary {
  totalConversations: number;
  activeUsers: number;
  activeAgents: number;
  escalationRate: number; // 0..1
  avgResponseMs: number;
  satisfaction: number; // 0..1
  tokensThisMonth: number;
  costThisMonthMicros: number;
  currency: string;
}

export interface PopularQuestion {
  question: string;
  count: number;
}

export interface KnowledgeUsageStat {
  documentTitle: string;
  retrievals: number;
}

/** A retrieved-knowledge citation shown in the playground. */
export interface RetrievedChunk {
  documentTitle: string;
  snippet: string;
  score: number;
}

export interface AiRunLog {
  id: string;
  agentId: string | null;
  promptVersionId: string | null;
  actorId: string | null;
  isPlayground: boolean;
  input: string | null;
  output: string | null;
  retrievedKnowledge: RetrievedChunk[];
  tokensInput: number | null;
  tokensOutput: number | null;
  latencyMs: number | null;
  status: string;
  createdAt: string;
}

/** The result of a playground run — LIVE inference through the configured provider. */
export interface PlaygroundResult {
  output: string;
  retrievedKnowledge: RetrievedChunk[];
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  modelKey: string;
  // ── Increment K: HERNE assembly inspection (present for HERNE specialists) ──
  isHerne?: boolean;
  citations?: { recordId: string; sourceTitle: string; sourceUrl: string }[];
  grounded?: boolean;
  escalationRecommended?: boolean;
  escalationReason?: string | null;
  resolvedLanguage?: string;
  costUsd?: number;
  safetyIssues?: string[];
  promptVersion?: { version: number; status: string } | null;
}
