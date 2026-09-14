import { NextResponse } from 'next/server';
import { getSession } from '@/services/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** GDPR-style member export. The response is deliberately JSON and scoped to the
 * authenticated member; failures are reported without leaking database details. */
export async function GET() {
  const session = await getSession();
  if (!session?.user.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const sb = createAdminClient();
  if (!sb) return NextResponse.json({ error: 'Export is temporarily unavailable.' }, { status: 503 });
  const uid = session.user.id;
  const tables = ['profiles', 'health_profiles', 'user_preferences', 'goals', 'conversations', 'messages', 'consents', 'member_onboarding'];
  const entries = await Promise.all(tables.map(async (table) => {
    const column = table === 'conversations' || table === 'messages' ? 'user_id' : 'user_id';
    const result = await sb.from(table).select('*').eq(column, uid);
    return [table, result.error ? [] : (result.data ?? [])] as const;
  }));
  return NextResponse.json({ exportedAt: new Date().toISOString(), userId: uid, data: Object.fromEntries(entries) }, { headers: { 'Cache-Control': 'no-store' } });
}
