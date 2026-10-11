import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

/** Uptime probe: 200 when the app is up and (if configured) the database answers. */
export async function GET() {
  if (!env.hasSupabase) return NextResponse.json({ ok: true, db: 'not-configured' });
  const { error } = await createPublicClient().from('site_settings').select('key').limit(1);
  return NextResponse.json({ ok: !error, db: error ? 'down' : 'up' }, { status: error ? 503 : 200 });
}
