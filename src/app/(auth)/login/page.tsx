import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { getProfile } from '@/lib/auth/session';
import { safeNextPath } from '@/lib/utils';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getProfile()) redirect(next);
  return <AuthForm mode="login" next={next} authError={sp.error === 'auth'} />;
}
