import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { safeNextPath } from '@/lib/utils';

/** OAuth / magic-link / password-reset landing: swaps the one-time code for a session cookie. `next` is validated (no open redirects). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${env.siteUrl}${next}`);
  }
  return NextResponse.redirect(`${env.siteUrl}/login?error=auth`);
}
