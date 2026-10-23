import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isSameOrigin } from '@/lib/security/origin';

/**
 * Runs on every page/API request (not static files):
 *  1. throttles bursts on /api and /auth per IP (cheap in-memory first line; precise per-user limits live in the handlers)
 *  2. CSRF: state-changing browser requests to our API must come from our own origin (payment gateway callbacks use GET + server-side verification; the Stripe webhook is signature-verified)
 *  3. refreshes the Supabase session cookie and bounces signed-out visitors away from private areas
 * Role checks (admin / worker) happen in the server layouts against the database, and again in RLS.
 */
const PRIVATE = ['/dashboard', '/worker', '/admin', '/book'];
const NO_ORIGIN_CHECK = ['/api/payments/stripe/webhook'];
const buckets = new Map<string, { n: number; reset: number }>();

function tooMany(key: string, limit: number, windowMs: number) {
  const now = Date.now(); const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k); return false; }
  return ++b.n > limit;
}

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.includes('-auth-token'));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/') || pathname.startsWith('/auth/');

  if (isApi) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!pathname.startsWith('/api/payments/') && tooMany(`${ip}:${pathname.split('/')[2] ?? ''}`, 120, 60_000))
      return new NextResponse('Too many requests', { status: 429, headers: { 'Retry-After': '30' } });
    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (mutating && !NO_ORIGIN_CHECK.includes(pathname) && !isSameOrigin(request)) return new NextResponse('Cross-site request blocked', { status: 403 });
  }

  const isPrivate = PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Fast path: if private route and no auth cookie at all, bounce instantly without hitting Supabase network
  if (isPrivate && !hasAuthCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Only refresh session if route is private or visitor has an active auth cookie
  let response = NextResponse.next({ request });
  if (isPrivate || hasAuthCookie(request)) {
    const sessionRes = await updateSession(request);
    response = sessionRes.response;
    if (isPrivate && !sessionRes.user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  response.headers.set('x-request-id', crypto.randomUUID());
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|txt|xml|webmanifest)$).*)'] };
