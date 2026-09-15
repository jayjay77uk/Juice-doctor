import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { provisionMember } from '@/services/provision-member';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const sb = await createSupabaseServerClient();
  if (code && sb) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await sb.auth.getUser();
      if (user && await provisionMember(user)) return NextResponse.redirect(new URL('/continue', url.origin));
    }
  }
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', url.origin));
}
