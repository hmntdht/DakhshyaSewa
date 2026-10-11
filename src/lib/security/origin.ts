import { env } from '@/lib/env';

/**
 * CSRF guard for cookie-authenticated, state-changing Route Handlers.
 * Browsers always send Origin (or Sec-Fetch-Site) on cross-site POSTs, which we reject.
 * (Server Actions get an equivalent Origin/Host check from Next.js itself.)
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin) {
    try { const o = new URL(origin); return o.host === host || o.origin === env.siteUrl; } catch { return false; }
  }
  const site = req.headers.get('sec-fetch-site');
  return !site || site === 'same-origin' || site === 'none';
}
