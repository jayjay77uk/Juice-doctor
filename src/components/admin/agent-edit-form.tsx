'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, AlertCircle } from 'lucide-react';
import type { AiAgent } from '@/types/ai';
import type { ModelOption } from '@/config/ai-models';
import { updateAgentAction } from '@/services/admin-actions';
import { idleAction } from '@/services/result';
import { Field, Input, Textarea, Select } from '@/components/ui/field';
import { Panel } from './panel';
import { Button } from '@/components/ui/button';

function SaveBar() {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-5 py-3 shadow-[var(--shadow-soft)] backdrop-blur">
      <p className="text-sm text-muted-foreground">Changes are saved to the agent configuration.</p>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save agent'}
      </Button>
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
      <span className="text-sm text-foreground">{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--color-primary)]" />
    </label>
  );
}

export function AgentEditForm({ agent, models }: { agent: AiAgent; models: ModelOption[] }) {
  const [state, formAction] = useActionState(updateAgentAction, idleAction);
  const fe = state.status === 'error' ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={agent.id} />

      {state.status === 'success' && (
        <p className="inline-flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 text-sm text-secondary" role="status">
          <Check className="size-4" /> {state.message}
        </p>
      )}
      {state.status === 'error' && (
        <p className="inline-flex items-center gap-2 rounded-xl bg-[#f6e3e0] px-4 py-2.5 text-sm text-danger" role="alert">
          <AlertCircle className="size-4" /> {state.message}
        </p>
      )}

      <Panel title="General">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" name="name" required error={fe?.name?.[0]}>
              <Input id="name" name="name" defaultValue={agent.name} />
            </Field>
            <Field label="Role" name="role" required error={fe?.role?.[0]}>
              <Input id="role" name="role" defaultValue={agent.role} />
            </Field>
          </div>
          <Field label="Code" name="code" hint="Short human reference (e.g. SP-1).">
            <Input id="code" name="code" defaultValue={agent.code} />
          </Field>
          <Field label="Description" name="description">
            <Textarea id="description" name="description" rows={2} defaultValue={agent.description} />
          </Field>
          <Field label="Purpose" name="purpose" hint="What this agent is for, distinct from its description.">
            <Textarea id="purpose" name="purpose" rows={2} defaultValue={agent.purpose} />
          </Field>
          <Field label="Visibility" name="visibility" hint="Who can see and use this agent.">
            <Select id="visibility" name="visibility" defaultValue={agent.visibility}>
              <option value="private">Private (staff only)</option>
              <option value="organisation">Organisation</option>
              <option value="public">Public</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel title="Behaviour" description="Personality, tone and the system prompt. Note: HERNE specialists (all eight production specialists) assemble their prompt from the shared DNA, published prompt versions and the bundled role definitions — the fields in this panel are stored but NOT read at inference for them.">
        <div className="flex flex-col gap-5">
          <Field label="Personality & conversation style" name="personality">
            <Textarea id="personality" name="personality" rows={3} defaultValue={agent.personality} />
          </Field>
          <Field label="System prompt" name="systemPrompt" hint="The core instruction. Full version history lives in Prompt Management.">
            <Textarea id="systemPrompt" name="systemPrompt" rows={8} defaultValue={agent.systemPrompt} className="font-mono text-sm" />
          </Field>
        </div>
      </Panel>

      <Panel title="Model configuration" description="Applied to live inference. Output is capped by the platform budget. Temperature applies only to Claude models that support sampling controls.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Default model" name="defaultModelId">
            <Select id="defaultModelId" name="defaultModelId" defaultValue={agent.defaultModelId ?? ''}>
              {agent.defaultModelId && !models.some(m => m.id === agent.defaultModelId) && <option value={agent.defaultModelId}>Saved model selection</option>}
              <option value="">— Not set —</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Temperature" name="temperature" hint="0 = precise, 2 = creative" error={fe?.temperature?.[0]}>
            <Input id="temperature" name="temperature" type="number" step="0.1" min="0" max="1" defaultValue={agent.temperature} />
          </Field>
          <Field label="Max output tokens" name="maxOutputTokens" error={fe?.maxOutputTokens?.[0]}>
            <Input id="maxOutputTokens" name="maxOutputTokens" type="number" min="1" defaultValue={agent.maxOutputTokens ?? 1024} />
          </Field>
        </div>
      </Panel>

      <Panel title="Memory configuration" description="Which memory scopes this agent may read. Note: HERNE specialists currently recall consented member memory regardless of these toggles.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle name="useUserMemory" label="User memory" defaultChecked={agent.memoryConfig.useUserMemory} />
          <Toggle name="useConversationMemory" label="Conversation memory" defaultChecked={agent.memoryConfig.useConversationMemory} />
          <Toggle name="useOrganisationMemory" label="Organisation memory" defaultChecked={agent.memoryConfig.useOrganisationMemory} />
          <Toggle name="useGlobalMemory" label="Global memory" defaultChecked={agent.memoryConfig.useGlobalMemory} />
        </div>
      </Panel>

      <Panel title="Safety rules" description="Reference notes only — these lines are NOT enforced at inference. The enforced safety floor (emergency, self-harm, diagnosis, medication, evidence checks) is fixed in code, plus any active policies from the Safety Centre.">
        <div className="flex flex-col gap-5">
          <Field label="Blocked topics" name="blockedTopics" hint="Comma or newline separated.">
            <Textarea id="blockedTopics" name="blockedTopics" rows={2} defaultValue={agent.safetyRules.blockedTopics.join(', ')} />
          </Field>
          <Field label="Escalate to a human on" name="escalateOn" hint="Comma or newline separated.">
            <Textarea id="escalateOn" name="escalateOn" rows={2} defaultValue={agent.safetyRules.escalateOn.join(', ')} />
          </Field>
          <Toggle name="requireDisclaimer" label="Require a medical disclaimer" defaultChecked={agent.safetyRules.requireDisclaimer} />
        </div>
      </Panel>

      <Panel title="Customer experience" description="What the customer sees first and the boundaries this agent keeps.">
        <div className="flex flex-col gap-5">
          <Field label="Welcome message" name="welcomeMessage" hint="The first message a customer sees when opening this specialist.">
            <Textarea id="welcomeMessage" name="welcomeMessage" rows={3} defaultValue={agent.welcomeMessage} />
          </Field>
          <Field label="Response boundaries" name="responseBoundaries" hint="Plain-English limits on what the agent will and will not do.">
            <Textarea id="responseBoundaries" name="responseBoundaries" rows={3} defaultValue={agent.responseBoundaries} />
          </Field>
        </div>
      </Panel>

      <Panel title="Availability" description="Whether this specialist is available to subscribe to.">
        <Toggle name="subscriptionAvailable" label="Available to subscribe to" defaultChecked={agent.subscriptionAvailable} />
      </Panel>

      <Panel title="Follow-up" description="How this specialist follows up with a subscribed customer.">
        <div className="flex flex-col gap-5">
          <Toggle name="followUpEnabled" label="Enable follow-ups" defaultChecked={agent.followUpConfig.enabled} />
          <Field label="Cadence" name="followUpCadence" hint="Placeholder cadence label (e.g. weekly).">
            <Input id="followUpCadence" name="followUpCadence" defaultValue={agent.followUpConfig.cadence} />
          </Field>
          <Field label="Follow-up message" name="followUpMessage" hint="The follow-up message template shown to the customer.">
            <Textarea id="followUpMessage" name="followUpMessage" rows={3} defaultValue={agent.followUpConfig.message} />
          </Field>
        </div>
      </Panel>

      <Panel title="Escalation" description="How this specialist hands a conversation to a human.">
        <div className="flex flex-col gap-5">
          <Toggle name="escalationEnabled" label="Enable escalation" defaultChecked={agent.escalationConfig.enabled} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Escalation target" name="escalationTarget" hint="Who the conversation is escalated to.">
              <Input id="escalationTarget" name="escalationTarget" defaultValue={agent.escalationConfig.target} />
            </Field>
            <Field label="Channel" name="escalationChannel">
              <Select id="escalationChannel" name="escalationChannel" defaultValue={agent.escalationConfig.channel}>
                <option value="in_app">In-app</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </Select>
            </Field>
          </div>
          <Field label="Escalation note" name="escalationNote">
            <Textarea id="escalationNote" name="escalationNote" rows={2} defaultValue={agent.escalationConfig.note} />
          </Field>
        </div>
      </Panel>

      {agent.product && (
        <Panel title="Specialist product" description="Commercial identity for this specialist sold as a subscription.">
          <input type="hidden" name="hasProduct" value="true" />
          <div className="flex flex-col gap-5">
            <Field label="Tagline" name="productTagline" hint="Short marketing tagline shown in the catalogue.">
              <Input id="productTagline" name="productTagline" defaultValue={agent.product.tagline} />
            </Field>
            <Field label="Expertise" name="productExpertise" hint="What this specialist helps with — one item per line.">
              <Textarea id="productExpertise" name="productExpertise" rows={4} defaultValue={agent.product.expertise.join('\n')} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Price label" name="productPriceLabel">
                <Input id="productPriceLabel" name="productPriceLabel" defaultValue={agent.product.priceLabel} />
              </Field>
              <Field label="Price amount" name="productPriceAmount" hint="Minor units (pence).">
                <Input id="productPriceAmount" name="productPriceAmount" type="number" min="0" step="1" defaultValue={agent.product.priceAmount} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Interval" name="productInterval">
                <Select id="productInterval" name="productInterval" defaultValue={agent.product.interval}>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </Select>
              </Field>
              <Field label="Accent" name="productAccent">
                <Select id="productAccent" name="productAccent" defaultValue={agent.product.accent}>
                  <option value="teal">Teal</option>
                  <option value="green">Green</option>
                  <option value="amber">Amber</option>
                  <option value="sage">Sage</option>
                </Select>
              </Field>
            </div>
          </div>
        </Panel>
      )}

      <SaveBar />
    </form>
  );
}
