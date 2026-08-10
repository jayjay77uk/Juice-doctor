import { NextResponse } from 'next/server';
import { getSession } from '@/services/auth';
import { voiceStatus } from '@/services/voice';

/** Real voice configuration state for the signed-in member's UI. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  return NextResponse.json(voiceStatus());
}
