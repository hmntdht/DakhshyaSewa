import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Expires stale pending bookings, purges old tracking breadcrumbs and rate-limit rows. Call every ~10 min with `Authorization: Bearer $CRON_SECRET`. */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer /i, '');
  if (!secret || secret.length < 16 || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return new NextResponse('unauthorized', { status: 401 });
  const { data, error } = await createAdminClient().rpc('expire_stale_bookings');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, expired: data });
}
export const GET = run;
export const POST = run;
