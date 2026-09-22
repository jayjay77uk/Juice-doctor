import { requireSession } from '@/lib/auth/authorize';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProgrammeForm } from '@/components/dashboard/programme-form';
export default async function MemberProgrammesPage() {
  const { user } = await requireSession();
  const sb = await createSupabaseServerClient();
  if (!sb) return <p role="alert">Programmes are unavailable.</p>;
  const [enrolments, progress] = await Promise.all([
    sb
      .from('programme_enrollments')
      .select('id,progress,status,programme_id, programmes!inner(title,publish_status)')
      .eq('member_id', user.id)
      .order('started_at', { ascending: false }),
    sb.from('programme_module_progress').select('module_id').eq('member_id', user.id),
  ]);
  if (enrolments.error || progress.error)
    return <p role="alert">Programmes could not be loaded. Please try again later.</p>;
  const ids = enrolments.data
    .filter((e) => ['active', 'completed'].includes(e.status))
    .map((e) => e.programme_id);
  const modules = ids.length
    ? await sb
        .from('programme_modules')
        .select('id,programme_id,title,body,position')
        .in('programme_id', ids)
        .order('position')
    : { data: [], error: null };
  if (modules.error) return <p role="alert">Programme modules could not be loaded.</p>;
  const complete = new Set(progress.data.map((p) => p.module_id));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-semibold">My programmes</h1>
      {!enrolments.data.length && (
        <p>No programmes are assigned yet. Contact the team to discuss enrolment.</p>
      )}
      {enrolments.data.map((e) => {
        const p = e.programmes as unknown as { title: string; publish_status: string };
        return (
          <section key={e.id} className="space-y-4 rounded-xl border p-5">
            <h2 className="text-xl font-semibold">{p.title}</h2>
            <p>
              {e.progress}% complete · {e.status}
            </p>
            <progress
              className="w-full"
              max={100}
              value={e.progress}
              aria-label={`${p.title} progress`}
            />
            {p.publish_status !== 'published' || !['active', 'completed'].includes(e.status) ? (
              <p>This programme is currently unavailable. Contact the team.</p>
            ) : (
              modules.data
                ?.filter((m) => m.programme_id === e.programme_id)
                .map((m) => (
                  <details key={m.id} className="rounded border p-4">
                    <summary className="cursor-pointer font-medium">
                      {m.position}. {m.title}
                      {complete.has(m.id) ? ' · Complete' : ''}
                    </summary>
                    <p className="my-4 whitespace-pre-wrap">{m.body}</p>
                    <ProgrammeForm
                      progress
                      label={complete.has(m.id) ? 'Mark incomplete' : 'Mark complete'}
                    >
                      <input type="hidden" name="moduleId" value={m.id} />
                      <input type="hidden" name="complete" value={String(!complete.has(m.id))} />
                    </ProgrammeForm>
                  </details>
                ))
            )}
          </section>
        );
      })}
    </div>
  );
}
