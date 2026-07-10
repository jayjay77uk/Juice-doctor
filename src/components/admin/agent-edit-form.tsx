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
          <Field label="Description" name="description">
            <Textarea id="description" name="description" rows={2} defaultValue={agent.description} />
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

      <Panel title="Behaviour" description="Personality, tone and the system prompt that define how this agent responds.">
        <div className="flex flex-col gap-5">
          <Field label="Personality & conversation style" name="personality">
            <Textarea id="personality" name="personality" rows={3} defaultValue={agent.personality} />
          </Field>
          <Field label="System prompt" name="systemPrompt" hint="The core instruction. Full version history lives in Prompt Management.">
            <Textarea id="systemPrompt" name="systemPrompt" rows={8} defaultValue={agent.systemPrompt} className="font-mono text-sm" />
          </Field>
        </div>
      </Panel>

      <Panel title="Model configuration">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Default model" name="defaultModelId">
            <Select id="defaultModelId" name="defaultModelId" defaultValue={agent.defaultModelId ?? ''}>
              <option value="">— Not set —</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Temperature" name="temperature" hint="0 = precise, 2 = creative" error={fe?.temperature?.[0]}>
            <Input id="temperature" name="temperature" type="number" step="0.1" min="0" max="2" defaultValue={agent.temperature} />
          </Field>
          <Field label="Max output tokens" name="maxOutputTokens" error={fe?.maxOutputTokens?.[0]}>
            <Input id="maxOutputTokens" name="maxOutputTokens" type="number" min="1" defaultValue={agent.maxOutputTokens ?? 1024} />
          </Field>
        </div>
      </Panel>

      <Panel title="Memory configuration" description="Which memory scopes this agent may read.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle name="useUserMemory" label="User memory" defaultChecked={agent.memoryConfig.useUserMemory} />
          <Toggle name="useConversationMemory" label="Conversation memory" defaultChecked={agent.memoryConfig.useConversationMemory} />
          <Toggle name="useOrganisationMemory" label="Organisation memory" defaultChecked={agent.memoryConfig.useOrganisationMemory} />
          <Toggle name="useGlobalMemory" label="Global memory" defaultChecked={agent.memoryConfig.useGlobalMemory} />
        </div>
      </Panel>

      <Panel title="Safety rules" description="Guardrails enforced around this agent. Full policies live in the Safety Centre.">
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

      <SaveBar />
    </form>
  );
}
