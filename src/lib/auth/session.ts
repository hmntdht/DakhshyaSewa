import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import type { Profile, Worker } from '@/types/db';

/** Verified user (asks Supabase Auth to validate the JWT, never trusts the cookie alone). */
export const getUser = cache(async () => {
  if (!env.hasSupabase) return null;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const sb = await createClient();
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireUser(next = '/dashboard'): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (p.status !== 'active') redirect('/suspended');
  return p;
}

export async function requireAdmin(): Promise<Profile> {
  const p = await requireUser('/admin');
  if (p.role !== 'admin') redirect('/');
  return p;
}

export async function requireWorker(next = '/worker'): Promise<{ profile: Profile; worker: Worker }> {
  const profile = await requireUser(next);
  const sb = await createClient();
  const { data } = await sb.from('workers').select('*').eq('user_id', profile.id).maybeSingle();
  if (!data) redirect('/become-a-worker');
  return { profile, worker: data as Worker };
}
