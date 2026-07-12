import 'server-only';

import type { ChatMessage } from '@/lib/ai';
import { agents } from './agents';
import { receptionist } from './receptionist';
import { specialistReply } from './specialist-reply';
import { memoryRepo } from './repositories/memory-repo';
import { ok, err, type Result } from './result';
import type { ConsultAnswer, ConversationTurn } from '@/types/crm';

/**
 * Multi-agent orchestration — the receptionist is the router; specialists are the
 * workers. `route()` runs the receptionist to pick the right specialist, then
 * hands the customer over to that specialist WITH the receptionist's context, so
 * the specialist starts already knowing the situation. Each agent stays within
 * its own responsibility; when the receptionist is not confident it escalates to
 * a human instead of guessing.
 */

export interface HandoverResult {
  routedTo: string | null;
  escalated: boolean;
  confidence: number;
  receptionistSummary: string;
  specialistReply: string | null;
  grounded: boolean;
}

export const orchestration = {
  /** Hand a customer to an already-chosen specialist, carrying context forward. */
  async handover(input: {
    specialistSlug: string;
    question: string;
    context: string;
    userId?: string | null;
    conversationId?: string | null;
  }): Promise<Result<{ specialist: string; reply: string; grounded: boolean }>> {
    const a = await agents.bySlug(input.specialistSlug);
    if (!a.ok) return err({ code: 'not_found', message: 'Specialist not found.' });
    const agent = a.data;

    // Persist the handover context as conversation memory so it survives the thread.
    if (input.conversationId && input.context.trim()) {
      await memoryRepo.remember({
        scope: 'conversation',
        kind: 'summary',
        key: `handover:${input.conversationId}`,
        content: `Context from the receptionist: ${input.context.trim()}`,
        conversationId: input.conversationId,
        agentId: agent.id,
        importance: 4,
        source: 'orchestration',
      });
    }

    const history: ChatMessage[] = input.context.trim()
      ? [{ role: 'assistant', content: `Context handed over from the receptionist: ${input.context.trim()}` }]
      : [];
    const reply = await specialistReply(agent, history, input.question, {
      userId: input.userId ?? null,
      conversationId: input.conversationId ?? null,
    });
    return ok({ specialist: agent.name, reply: reply.text, grounded: reply.grounded });
  },

  /** Full route: receptionist assesses → recommends → (if confident) specialist answers the follow-up. */
  async route(input: {
    conversation: ConversationTurn[];
    answers: ConsultAnswer[];
    followUpQuestion: string;
    userId?: string | null;
  }): Promise<Result<HandoverResult>> {
    const assessed = await receptionist.assess({ conversation: input.conversation, answers: input.answers });
    if (!assessed.ok) return assessed;
    const { recommendation, summary } = assessed.data;

    if (recommendation.escalate || !recommendation.specialistSlug) {
      // Receptionist not confident — hand to a human, do NOT route to a specialist.
      return ok({
        routedTo: null,
        escalated: true,
        confidence: recommendation.confidence,
        receptionistSummary: summary,
        specialistReply: null,
        grounded: false,
      });
    }

    const handover = await orchestration.handover({
      specialistSlug: recommendation.specialistSlug,
      question: input.followUpQuestion,
      context: summary,
      userId: input.userId ?? null,
    });
    return ok({
      routedTo: recommendation.specialistName,
      escalated: false,
      confidence: recommendation.confidence,
      receptionistSummary: summary,
      specialistReply: handover.ok ? handover.data.reply : null,
      grounded: handover.ok ? handover.data.grounded : false,
    });
  },
};
