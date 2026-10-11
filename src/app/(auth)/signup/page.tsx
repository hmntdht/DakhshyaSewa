import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { getProfile } from '@/lib/auth/session';
import { safeNextPath } from '@/lib/utils';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getProfile()) redirect(next);
  return <AuthForm mode="signup" next={next} />;
}
