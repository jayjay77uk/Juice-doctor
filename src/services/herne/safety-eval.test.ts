import { describe, it, expect } from 'vitest';
import { precheckInput, postcheckOutput } from './safety-eval';

describe('HERNE safety pre-check', () => {
  it('blocks + escalates self-harm language with crisis wording', () => {
    const r = precheckInput('I feel like I want to kill myself');
    expect(r.blocked).toBe(true);
    expect(r.escalate).toBe(true);
    expect(r.category).toBe('self_harm');
    expect(r.trigger).toBe('emergency');
    expect(r.userMessage).toBeTruthy();
    expect(r.messageStatus).toBe('awaiting_client_approval');
  });

  it('blocks + escalates acute emergency symptoms', () => {
    const r = precheckInput('I have severe chest pain and can\'t breathe');
    expect(r.blocked).toBe(true);
    expect(r.category).toBe('emergency');
    expect(r.urgency).toBe('immediate');
  });

  it('escalates a medication-change request without blocking the whole reply', () => {
    const r = precheckInput('should I stop taking my medication?');
    expect(r.blocked).toBe(false);
    expect(r.escalate).toBe(true);
    expect(r.category).toBe('medication_change');
    expect(r.trigger).toBe('clinical_review');
  });

  it('flags a diagnosis request', () => {
    const r = precheckInput('do i have diabetes?');
    expect(r.category).toBe('diagnosis_request');
    expect(r.escalate).toBe(true);
    expect(r.blocked).toBe(false);
  });

  it('passes ordinary wellbeing questions', () => {
    const r = precheckInput('how much water should I drink each day?');
    expect(r.blocked).toBe(false);
    expect(r.escalate).toBe(false);
    expect(r.category).toBe('none');
  });
});

describe('HERNE safety post-check', () => {
  it('keeps allowed citations and strips fabricated ones', () => {
    const text = 'Hydration matters [HERNE-H-001]. Also consider sleep [HERNE-X-999].';
    const r = postcheckOutput(text, ['HERNE-H-001', 'HERNE-H-002']);
    expect(r.text).toContain('[HERNE-H-001]');
    expect(r.text).not.toContain('HERNE-X-999');
    expect(r.fabricatedCitations).toEqual(['HERNE-X-999']);
    expect(r.issues).toContain('fabricated_citation');
    expect(r.ok).toBe(false);
  });

  it('flags an unsupported diagnosis claim and marks it for escalation', () => {
    const r = postcheckOutput('Based on this, you have diabetes and should worry.', ['HERNE-H-001']);
    expect(r.issues).toContain('unsupported_diagnosis');
    expect(r.mustEscalate).toBe(true);
  });

  it('passes clean, correctly-cited output', () => {
    const r = postcheckOutput('Aim for steady hydration through the day [HERNE-H-001].', ['HERNE-H-001']);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.fabricatedCitations).toEqual([]);
  });
});
