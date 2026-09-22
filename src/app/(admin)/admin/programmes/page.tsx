import { requirePermission } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProgrammeForm } from '@/components/dashboard/programme-form';
import { ProgrammeFields } from '@/components/admin/programme-fields';
const field = 'rounded border bg-surface p-2';
export default async function AdminProgrammesPage() {
  const { user } = await requirePermission('programmes.read');
  const sb = createAdminClient();
  if (!sb || !user.organisationId) return <p role="alert">Programme storage is unavailable.</p>;
  const [programmes, members] = await Promise.all([
    sb
      .from('programmes')
      .select(
        '*, programme_modules(id,title,body,position), programme_enrollments(id,member_id,status,progress)',
      )
      .eq('organisation_id', user.organisationId)
      .order('created_at', { ascending: false })
      .limit(100),
    sb
      .from('profiles')
      .select('id,full_name,email')
      .eq('organisation_id', user.organisationId)
      .eq('status', 'active')
      .order('full_name')
      .limit(500),
  ]);
  if (programmes.error || members.error)
    return (
      <p role="alert">
        Programmes could not be loaded. Check that the programme delivery migration has been
        applied.
      </p>
    );
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <h1 className="text-3xl font-semibold">Programmes</h1>
      <p>
        Create a draft, add reviewed modules, publish, then assign members. An enrolled curriculum
        is fixed; create a new version to change it. Showing the latest 100 programmes.
      </p>
      <details className="rounded-xl border p-5">
        <summary className="cursor-pointer font-semibold">Create programme</summary>
        <ProgrammeForm label="Create draft">
          <input type="hidden" name="operation" value="create" />
          <ProgrammeFields />
        </ProgrammeForm>
      </details>
      {!programmes.data.length && <p>No programmes have been created.</p>}
      {programmes.data.map((p) => (
        <section key={p.id} className="space-y-5 rounded-xl border p-5">
          <h2 className="text-xl font-semibold">
            {p.title} · {p.publish_status}
          </h2>
          <p>{p.summary}</p>
          {p.publish_status === 'draft' && (
            <details>
              <summary>Edit programme details</summary>
              <ProgrammeForm label="Save details">
                <input type="hidden" name="operation" value="edit" />
                <input type="hidden" name="programmeId" value={p.id} />
                <ProgrammeFields values={p} />
              </ProgrammeForm>
            </details>
          )}
          <ol className="space-y-3">
            {(
              p.programme_modules as { id: string; title: string; body: string; position: number }[]
            )
              .sort((a, b) => a.position - b.position)
              .map((m) => (
                <li key={m.id}>
                  <details>
                    <summary>
                      {m.position}. {m.title}
                    </summary>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    {p.publish_status === 'draft' && (
                      <div className="my-4 space-y-3">
                        <ProgrammeForm label="Save module">
                          <input type="hidden" name="operation" value="edit_module" />
                          <input type="hidden" name="programmeId" value={p.id} />
                          <input type="hidden" name="moduleId" value={m.id} />
                          <label className="flex flex-col">
                            Title
                            <input
                              className={field}
                              name="title"
                              required
                              maxLength={160}
                              defaultValue={m.title}
                            />
                          </label>
                          <label className="flex flex-col">
                            Position
                            <input
                              className={field}
                              name="position"
                              type="number"
                              min={1}
                              max={1000}
                              required
                              defaultValue={m.position}
                            />
                          </label>
                          <label className="flex flex-col">
                            Content
                            <textarea
                              className={field}
                              name="body"
                              required
                              maxLength={20000}
                              defaultValue={m.body}
                            />
                          </label>
                        </ProgrammeForm>
                        <ProgrammeForm label="Remove module">
                          <input type="hidden" name="operation" value="remove_module" />
                          <input type="hidden" name="programmeId" value={p.id} />
                          <input type="hidden" name="moduleId" value={m.id} />
                        </ProgrammeForm>
                      </div>
                    )}
                  </details>
                </li>
              ))}
          </ol>
          {p.publish_status === 'draft' && (
            <details>
              <summary className="cursor-pointer">Add module</summary>
              <ProgrammeForm label="Add module">
                <input type="hidden" name="operation" value="module" />
                <input type="hidden" name="programmeId" value={p.id} />
                <label className="flex flex-col">
                  Title
                  <input className={field} name="title" required maxLength={160} />
                </label>
                <label className="flex flex-col">
                  Position
                  <input
                    className={field}
                    name="position"
                    type="number"
                    min={1}
                    max={1000}
                    required
                  />
                </label>
                <label className="flex flex-col">
                  Reviewed module content
                  <textarea className={field} name="body" rows={8} required maxLength={20000} />
                </label>
              </ProgrammeForm>
            </details>
          )}
          <ProgrammeForm
            label={p.publish_status === 'published' ? 'Unpublish' : 'Publish reviewed programme'}
          >
            <input
              type="hidden"
              name="operation"
              value={p.publish_status === 'published' ? 'unpublish' : 'publish'}
            />
            <input type="hidden" name="programmeId" value={p.id} />
          </ProgrammeForm>
          {p.publish_status === 'published' && (
            <ProgrammeForm label="Assign programme">
              <input type="hidden" name="operation" value="enrol" />
              <input type="hidden" name="programmeId" value={p.id} />
              <label className="flex flex-col">
                Member
                <select className={field} name="memberId" required>
                  <option value="">Select member</option>
                  {members.data.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email ?? m.id}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-muted-foreground text-sm">
                Assignment grants access. It does not collect payment.
              </p>
            </ProgrammeForm>
          )}
          <details>
            <summary>Member progress and access</summary>
            <ul className="space-y-3">
              {(
                p.programme_enrollments as {
                  id: string;
                  member_id: string;
                  status: string;
                  progress: number;
                }[]
              ).map((e) => (
                <li key={e.id} className="rounded border p-3">
                  <p>
                    {members.data.find((m) => m.id === e.member_id)?.full_name ?? e.member_id} ·{' '}
                    {e.progress}% complete · {e.status}
                  </p>
                  <ProgrammeForm label="Update access">
                    <input type="hidden" name="operation" value="enrolment_status" />
                    <input type="hidden" name="programmeId" value={p.id} />
                    <input type="hidden" name="enrolmentId" value={e.id} />
                    <label>
                      Status
                      <select
                        name="status"
                        className={field}
                        defaultValue={e.status === 'completed' ? 'active' : e.status}
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                  </ProgrammeForm>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ))}
    </div>
  );
}
