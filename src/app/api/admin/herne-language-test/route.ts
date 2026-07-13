import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/services/auth';
import { hasMinRole } from '@/lib/auth/roles';
import { agents } from '@/services/agents';
import { herneSpecialistReply } from '@/services/herne/reply';
import { HERNE_LANGUAGES } from '@/data/herne/languages';
import {
  HERNE_CAPABILITIES,
  languageDirective,
  resolveLanguagePreference,
  specialistVoiceCapability,
} from '@/services/herne/language';

/**
 * Admin-gated multilingual/voice check: proves (1) the catalogue loads, (2) the
 * capability model reports the honest live/planned split, (3) a specialist answers
 * the SAME question in the requested language while keeping the English default
 * un-directed. Example: /api/admin/herne-language-test?slug=makela&lang=es
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !hasMinRole(session.user.role, 'administrator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slug = request.nextUrl.searchParams.get('slug') ?? 'makela';
  const langCode = request.nextUrl.searchParams.get('lang') ?? 'es';
  const q = request.nextUrl.searchParams.get('q') ?? 'I feel exhausted and a little overwhelmed. Where should I start?';

  const chosen = resolveLanguagePreference({ language: langCode });
  const english = resolveLanguagePreference({ language: 'en-GB' });

  const a = await agents.bySlug(slug);
  const replies: Record<string, unknown> = {};
  if (a.ok) {
    const [inLang, inEnglish] = await Promise.all([
      herneSpecialistReply(a.data, [], q, { language: chosen }),
      herneSpecialistReply(a.data, [], q, { language: english }),
    ]);
    replies.chosen = { language: inLang.language, available: inLang.available, preview: inLang.text.slice(0, 300) };
    replies.english = { language: inEnglish.language, available: inEnglish.available, preview: inEnglish.text.slice(0, 200) };
  } else {
    replies.error = 'specialist not found';
  }

  return NextResponse.json({
    catalogueCount: HERNE_LANGUAGES.length,
    capabilities: HERNE_CAPABILITIES,
    voiceCapability: specialistVoiceCapability(),
    directiveForDefaultIsNull: languageDirective(english) === null,
    directiveForChosen: languageDirective(chosen),
    slug,
    question: q,
    replies,
  });
}
