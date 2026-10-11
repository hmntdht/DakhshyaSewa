import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env, NotConfiguredError } from '@/lib/env';

/**
 * SERVICE ROLE client: bypasses RLS. Only import from server code that has already authenticated
 * the caller (payment callbacks, webhooks, enquiry intake, cron). `server-only` makes the build fail
 * if this file is ever pulled into a client bundle.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.hasSupabase || !key) throw new NotConfiguredError();
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
