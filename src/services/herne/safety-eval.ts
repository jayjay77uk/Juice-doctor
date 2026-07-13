/**
 * HERNE safety evaluation — PURE (no server-only), so it is unit-tested and shared
 * by the reply path and the admin playground. Two phases around every live call:
 *
 *   precheckInput()  — before inference: detect emergencies, self-harm, medication-
 *                      change and clear out-of-scope/diagnosis requests. Emergencies
 *                      STOP normal coaching and route to an approved escalation path.
 *   postcheckOutput() — after inference: strip fabricated citations (record ids not
 *                      in the retrieved evidence) and flag unsupported diagnosis /
 *                      treatment claims, so the model can never invent a source or a
 *                      diagnosis that the approved evidence does not support.
 *
 * Approved clinical wording has NOT been supplied by the client. The emergency /
 * crisis copy below is clearly marked `awaiting_client_approval` interim wording and
 * MUST be replaced with client-approved copy before any real clinical use.
 */

export type SafetyCategory = 'emergency' | 'self_harm' | 'medication_change' | 'diagnosis_request' | 'out_of_scope' | 'none';

export type ContentStatus = 'client_supplied' | 'awaiting_client_approval';

export interface SafetyPrecheck {
  /** Stop normal coaching and show the approved message instead. */
  blocked: boolean;
  /** Create an escalation record. */
  escalate: boolean;
  category: SafetyCategory;
  /** EscalationTrigger value for the escalation engine, when escalate is true. */
  trigger: 'emergency' | 'clinical_review' | 'human_review' | 'outside_scope' | null;
  urgency: 'immediate' | 'prompt' | 'routine' | null;
  /** Approved-wording message to show the user when blocked (else null). */
  userMessage: string | null;
  /** Provenance of userMessage — surfaces the awaiting-approval state. */
  messageStatus: ContentStatus;
  reason: string | null;
}

export interface SafetyPostcheck {
  ok: boolean;
  /** The output text after removing fabricated citations. */
  text: string;
  /** Machine issues found, e.g. 'fabricated_citation', 'unsupported_diagnosis'. */
  issues: string[];
  /** Record ids the model cited that were NOT in the retrieved evidence. */
  fabricatedCitations: string[];
  /** True when an issue warrants human review. */
  mustEscalate: boolean;
}

// ── Detection patterns ───────────────────────────────────────────────────────
const SELF_HARM = /\b(suicid\w*|kill myself|end my life|take my (own )?life|self[-\s]?harm|hurt myself|don'?t want to (be alive|live))\b/i;
const EMERGENCY = /\b(chest pain|can'?t breathe|cannot breathe|struggling to breathe|severe bleeding|bleeding heavily|unconscious|passed out|stroke|face drooping|slurred speech|numbness (on|down) one side|anaphyla\w*|overdose|seizure)\b/i;
const MEDICATION_CHANGE = /\b(stop(ping)? (taking )?(my )?(medication|meds|tablets|insulin)|come off my (medication|meds)|(increase|reduce|double|halve|change|adjust) (my )?(dose|dosage)|skip my (medication|meds|dose))\b/i;
const DIAGNOSIS_REQUEST = /\b(do i have|what'?s wrong with me|diagnose me|is it cancer|is this cancer|is it a tumou?r|am i (dying|diabetic))\b/i;

/** Interim, clearly-unapproved emergency wording. Replace with client-approved copy. */
export const INTERIM_EMERGENCY_MESSAGE =
  'This sounds like it may need urgent medical attention. Please contact your local emergency services now (for example, call 999 in the UK or 112 in the EU). If you are not in immediate danger but need urgent advice, contact NHS 111 or your GP. I can help again once you are safe. [Interim wording — awaiting client-approved copy.]';

export const INTERIM_SELF_HARM_MESSAGE =
  'I’m really glad you told me, and I’m concerned for your safety. Please reach out right now to someone who can help — in the UK you can call the Samaritans free on 116 123 (24/7) or dial 999 if you are in immediate danger. You deserve support from a person, not an AI, for this. [Interim wording — awaiting client-approved copy.]';

export function precheckInput(text: string): SafetyPrecheck {
  const none: SafetyPrecheck = {
    blocked: false, escalate: false, category: 'none', trigger: null, urgency: null,
    userMessage: null, messageStatus: 'client_supplied', reason: null,
  };
  if (!text?.trim()) return none;

  if (SELF_HARM.test(text)) {
    return {
      blocked: true, escalate: true, category: 'self_harm', trigger: 'emergency', urgency: 'immediate',
      userMessage: INTERIM_SELF_HARM_MESSAGE, messageStatus: 'awaiting_client_approval',
      reason: 'Self-harm / crisis language detected — normal coaching stopped, human crisis support required.',
    };
  }
  if (EMERGENCY.test(text)) {
    return {
      blocked: true, escalate: true, category: 'emergency', trigger: 'emergency', urgency: 'immediate',
      userMessage: INTERIM_EMERGENCY_MESSAGE, messageStatus: 'awaiting_client_approval',
      reason: 'Acute emergency symptoms detected — normal coaching stopped, urgent professional assessment required.',
    };
  }
  if (MEDICATION_CHANGE.test(text)) {
    return {
      blocked: false, escalate: true, category: 'medication_change', trigger: 'clinical_review', urgency: 'prompt',
      userMessage: null, messageStatus: 'client_supplied',
      reason: 'Medication-change request — outside AI scope; apply boundary and route to a healthcare professional.',
    };
  }
  if (DIAGNOSIS_REQUEST.test(text)) {
    return {
      blocked: false, escalate: true, category: 'diagnosis_request', trigger: 'clinical_review', urgency: 'routine',
      userMessage: null, messageStatus: 'client_supplied',
      reason: 'Diagnosis request — AI must not diagnose; explain the boundary and route to a professional.',
    };
  }
  return none;
}

// A record id looks like HERNE-H-001 (uppercase letters + hyphens + digits).
const CITATION_TOKEN = /\[([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\]/g;
const DIAGNOSIS_CLAIM = /\b(you (have|are suffering from)|i diagnose|this is (a )?diagnosis|you are (diabetic|hypertensive)|you'?ve got)\b/i;

/**
 * Post-check the model output against the evidence it was actually given.
 * `allowedRecordIds` is the set of retrieved record ids the model was permitted to
 * cite. Any bracketed record-id-shaped token NOT in that set is a fabricated
 * citation and is stripped from the text.
 */
export function postcheckOutput(text: string, allowedRecordIds: string[]): SafetyPostcheck {
  const allowed = new Set(allowedRecordIds);
  const fabricated: string[] = [];
  const cleaned = text.replace(CITATION_TOKEN, (match, id: string) => {
    if (allowed.has(id)) return match;
    fabricated.push(id);
    return ''; // strip the fabricated citation entirely
  });
  const issues: string[] = [];
  if (fabricated.length) issues.push('fabricated_citation');
  if (DIAGNOSIS_CLAIM.test(cleaned)) issues.push('unsupported_diagnosis');
  // Tidy any double spaces left by stripped tokens.
  const text2 = cleaned.replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:])/g, '$1').trim();
  return {
    ok: issues.length === 0,
    text: text2,
    issues,
    fabricatedCitations: [...new Set(fabricated)],
    mustEscalate: issues.includes('unsupported_diagnosis'),
  };
}
