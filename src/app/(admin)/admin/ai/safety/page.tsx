import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { createMetadata } from '@/config/metadata';
import { safety } from '@/services/safety';
import type { SafetyPolicy } from '@/types/ai-platform';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';

export const metadata: Metadata = createMetadata({ title: 'Safety Centre' });

export default async function SafetyPage() {
  const result = await safety.list();
  const policies: SafetyPolicy[] = result.ok ? result.data : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <AdminHeader
        title="Safety Centre"
        description="Guardrail policies stored in the database. The runtime safety checks (emergency block, medication boundary, citation stripping) are live and enforced in code; wiring these configurable policies into inference is coming soon."
        breadcrumbs={[{ label: 'AI', href: '/admin/ai' }, { label: 'Safety' }]}
      />

      <p className="text-sm text-muted-foreground">
        Every field below — topics, medical boundaries, escalation rules and thresholds — is fully
        configurable per policy in production.
      </p>

      {policies.length === 0 ? (
        <Panel>
          <EmptyState
            icon={ShieldCheck}
            title="No safety policies yet"
            description="Safety policies are created alongside your member-facing agents."
          />
        </Panel>
      ) : (
        policies.map((policy) => (
          <Panel
            key={policy.id}
            title={policy.name}
            {...(policy.description ? { description: policy.description } : {})}
            actions={<StatusBadge status={policy.status} />}
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">Allowed topics</h3>
                {policy.allowedTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None specified.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {policy.allowedTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-green-100 px-2.5 py-1 text-xs text-secondary"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">Restricted topics</h3>
                {policy.restrictedTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None specified.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {policy.restrictedTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-[#f6e3e0] px-2.5 py-1 text-xs text-danger"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-2 sm:col-span-2">
                <h3 className="text-sm font-medium text-foreground">Medical boundaries</h3>
                {policy.medicalBoundaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None specified.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {policy.medicalBoundaries.map((boundary) => (
                      <li key={boundary} className="flex items-start gap-2 text-sm text-foreground">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{boundary}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="mt-6 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Confidence threshold
                </span>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {(policy.confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Human escalation
                </span>
                <StatusBadge status={policy.humanEscalation ? 'enabled' : 'disabled'} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Role restrictions
                </span>
                <span className="text-sm font-medium text-foreground">
                  {policy.roleRestrictions.join(', ') || 'All roles'}
                </span>
              </div>
            </div>
          </Panel>
        ))
      )}

      <p className="text-sm text-muted-foreground">
        Live safety policies from the platform database. AI replies run on the live model and are not clinically reviewed; not for emergencies.
      </p>
    </div>
  );
}
