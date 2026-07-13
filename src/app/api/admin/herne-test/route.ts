import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/services/auth';
import { hasMinRole } from '@/lib/auth/roles';
import { agents } from '@/services/agents';
import { retrieveForSpecialist } from '@/services/herne/retrieval';
import { herneSpecialistReply } from '@/services/herne/reply';

/**
 * Admin-gated differentiation check: the same question through multiple
 * specialists — same shared evidence, differently ranked, differently presented.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasMinRole(session.user.role, 'administrator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const q = request.nextUrl.searchParams.get('q') ?? 'I keep feeling tired and a bit bloated — how much water should I be drinking?';
  const slugs = (request.nextUrl.searchParams.get('specialists') ?? 'aqua,felix').split(',').map((s) => s.trim());

  const results = [];
  for (const slug of slugs) {
    const a = await agents.bySlug(slug);
    if (!a.ok) {
      results.push({ slug, error: 'specialist not found' });
      continue;
    }
    const retrieved = await retrieveForSpecialist(slug, q);
    const reply = await herneSpecialistReply(a.data, [], q);
    results.push({
      slug,
      name: reply.specialist,
      topRecords: retrieved.slice(0, 3).map((r) => ({ recordId: r.recordId, role: r.role, final: r.score.final })),
      citations: reply.citations.map((c) => c.recordId),
      grounded: reply.grounded,
      escalation: reply.escalationRecommended,
      replyPreview: reply.text.slice(0, 260),
    });
  }
  return NextResponse.json({ query: q, results });
}
