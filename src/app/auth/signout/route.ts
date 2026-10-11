import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/security/origin';
import { env } from '@/lib/env';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  try { await (await createClient()).auth.signOut(); } catch { /* not configured or already signed out */ }
  return NextResponse.redirect(`${env.siteUrl}/`, { status: 303 });
}
