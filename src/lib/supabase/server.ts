import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env, NotConfiguredError } from '@/lib/env';

/** Session-aware client for Server Components, Server Actions and Route Handlers. RLS applies as the signed-in user. */
export async function createClient() {
  if (!env.hasSupabase) throw new NotConfiguredError();
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* called from a Server Component: middleware refreshes the session instead */ }
      },
    },
  });
}
