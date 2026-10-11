import 'server-only';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Rate limiting for Server Actions and Route Handlers. Back-ends, in order of preference:
 *   1. Upstash Redis (UPSTASH_REDIS_REST_URL / _TOKEN)    → shared across all serverless instances
 *   2. Postgres consume_rate_limit() via the service role → shared, zero extra infrastructure
 *   3. in-memory                                          → per instance, last resort / local dev
 * Fails OPEN on infrastructure errors (an outage of the limiter must not take bookings down).
 */
const mem = new Map<string, { n: number; reset: number }>();

function memoryLimit(key: string, limit: number, windowSec: number) {
  const now = Date.now();
  const e = mem.get(key);
  if (!e || e.reset < now) { mem.set(key, { n: 1, reset: now + windowSec * 1000 }); if (mem.size > 5000) for (const [k, v] of mem) if (v.reset < now) mem.delete(k); return true; }
  e.n += 1;
  return e.n <= limit;
}

async function upstash(key: string, limit: number, windowSec: number) {
  const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(windowSec), 'NX']]),
  });
  if (!r.ok) throw new Error(`upstash ${r.status}`);
  const j = (await r.json()) as { result: number }[];
  return Number(j[0].result) <= limit;
}

export async function rateLimit(key: string, limit: number, windowSec = 60): Promise<boolean> {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return await upstash(`ds:${key}`, limit, windowSec);
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error } = await createAdminClient().rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSec });
      if (error) throw error;
      return data === true;
    }
  } catch (e) {
    console.error('[rate-limit] backend error, falling back to memory:', (e as Error).message);
  }
  return memoryLimit(key, limit, windowSec);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim().slice(0, 64);
}
export async function userAgent(): Promise<string> {
  return ((await headers()).get('user-agent') ?? '').slice(0, 300);
}
