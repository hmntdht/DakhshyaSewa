import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';

/** Refreshes the auth cookie on every matched request and returns the *verified* user (getUser hits Auth, not just the cookie). */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!env.hasSupabase) return { response, user: null };

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}
