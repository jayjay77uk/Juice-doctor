import Link from 'next/link';
import { createMetadata } from '@/config/metadata';
import { requireSession } from '@/lib/auth/authorize';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { JournalForm } from '@/components/dashboard/journal-form';
import type { JournalEntry } from '@/lib/journal';
import { Panel } from '@/components/admin/panel';

export const metadata = createMetadata({ title: 'My journal' });
export default async function JournalPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requireSession('/dashboard/journal');
  const params = await searchParams;
  const page = Math.min(10000, Math.max(0, Math.floor(Number(params.page) || 0)));
  const sb = await createSupabaseServerClient();
  const result = sb ? await sb.from('member_journal').select('id, entry_date, title, body', { count: 'exact' })
    .eq('user_id', session.user.id).is('archived_at', null)
    .order('entry_date', { ascending: false }).order('id', { ascending: false }).range(page * 20, page * 20 + 19) : null;
  if (!result || result.error) return <Panel title="My journal"><p role="alert">Your journal is currently unavailable. Please try again later.</p></Panel>;
  const today = new Date().toISOString().slice(0, 10);
  return <div className="mx-auto flex max-w-3xl flex-col gap-6">
    <Panel title="My journal" description="Private reflections. Journal entries are not automatically sent to AI specialists or practitioners."><JournalForm today={today} /></Panel>
    {!result.data.length && <p>No entries yet.</p>}
    {(result.data as JournalEntry[]).map(entry => <Panel key={entry.id} title={entry.title} description={entry.entry_date}>
      <p className="whitespace-pre-wrap">{entry.body}</p>
      <details className="mt-4"><summary>Edit or archive</summary><JournalForm entry={entry} today={today} /></details>
    </Panel>)}
    <nav aria-label="Journal pages" className="flex justify-between">
      {page > 0 && <Link href={`/dashboard/journal?page=${page - 1}`}>Newer entries</Link>}
      {(page + 1) * 20 < (result.count ?? 0) && <Link href={`/dashboard/journal?page=${page + 1}`}>Older entries</Link>}
    </nav>
  </div>;
}
