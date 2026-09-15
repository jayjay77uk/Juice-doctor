import { NextResponse } from 'next/server';
import { getSession } from '@/services/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { exportAccount } from '@/services/account-export';

export const dynamic = 'force-dynamic';

/** GDPR-style member export. The response is deliberately JSON and scoped to the
 * authenticated member; failures are reported without leaking database details. */
export async function GET() {
  const session = await getSession();
  if (!session?.user.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const sb = createAdminClient();
  if (!sb) return NextResponse.json({ error: 'Export is temporarily unavailable.' }, { status: 503 });
  const uid = session.user.id;
  try {
    const data = await exportAccount(sb, uid);
    return NextResponse.json({ exportedAt: new Date().toISOString(), userId: uid, data }, {
      headers: { 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="juice-doctor-account.json"' },
    });
  } catch {
    return NextResponse.json({ error: 'Your complete export could not be generated. Please try again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
