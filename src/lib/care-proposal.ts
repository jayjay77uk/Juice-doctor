import { z } from 'zod';
import { precheckInput, postcheckOutput } from '@/services/herne/safety-eval';

export const careProposalSchema = z.object({ title: z.string().trim().min(1).max(120), detail: z.string().trim().min(1).max(1500), evidenceRefs: z.array(z.string().max(100)).max(6) }).strict();

export function safeCareProposal(input: unknown, allowedEvidenceIds: string[]) {
  const parsed = careProposalSchema.safeParse(input);
  if (!parsed.success) return null;
  const proposal = parsed.data;
  const text = `${proposal.title}\n${proposal.detail}`;
  const pre = precheckInput(text);
  const post = postcheckOutput(text, allowedEvidenceIds);
  const clinical = /\b(prescrib\w*|diagnos\w*|medicat\w*|dosage|dose|insulin|antibiotic\w*|supplement\w*|cure\w*|treat\w*)\b|\b\d+\s*mg\b/i;
  if (pre.blocked || pre.escalate || !post.ok || clinical.test(text) || proposal.evidenceRefs.some(ref => !allowedEvidenceIds.includes(ref))) return null;
  return proposal;
}
