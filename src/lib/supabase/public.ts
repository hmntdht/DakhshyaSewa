import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, NotConfiguredError } from '@/lib/env';

/**
 * Anonymous, cookie-free client for CACHEABLE public reads (categories, config, featured workers).
 * Because it never touches cookies(), pages that use it stay static / ISR-friendly.
 */
let client: SupabaseClient | undefined;
export function createPublicClient() {
  if (!env.hasSupabase) throw new NotConfiguredError();
  client ??= createClient(env.supabaseUrl, env.supabaseAnon, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
