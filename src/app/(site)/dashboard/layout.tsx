import type { Metadata } from 'next';
import { DashNav } from '@/components/dashboard/DashNav';
import { requireUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

// Private area: always rendered per request (never prerendered or cached across users).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser('/dashboard');
  const sb = await createClient();
  const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).is('read_at', null);
  return <div className="container-x py-10 sm:py-14"><DashNav unread={count ?? 0} />{children}</div>;
}
