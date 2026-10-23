import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { Banknote, CalendarClock, ShieldCheck } from 'lucide-react';
import { T } from '@/components/T';
import { getProfile } from '@/lib/auth/session';
import { getCategories } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';

const ApplyForm = nextDynamic(() => import('@/components/worker/ApplyForm').then((m) => m.ApplyForm), {
  loading: () => (
    <div className="space-y-8 animate-pulse">
      <div className="h-48 rounded-app border border-line bg-surface/60" />
      <div className="h-64 rounded-app border border-line bg-surface/60" />
      <div className="h-72 rounded-app border border-line bg-surface/60" />
    </div>
  ),
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Become a worker' };

export default async function BecomeWorker() {
  const [profile, cats] = await Promise.all([getProfile(), getCategories()]);
  if (profile) { const { data } = await (await createClient()).from('workers').select('id').eq('user_id', profile.id).maybeSingle(); if (data) redirect('/worker'); }
  const perks = [[Banknote, 'apply.perk1'], [CalendarClock, 'apply.perk2'], [ShieldCheck, 'apply.perk3']] as const;
  return (
    <div className="container-x py-14 sm:py-20">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h1 className="text-balance text-4xl font-light tracking-tight sm:text-6xl"><T k="apply.title" /></h1>
          <p className="mt-5 text-lg leading-relaxed text-muted"><T k="apply.sub" /></p>
          <ul className="mt-9 space-y-5">{perks.map(([I, k]) => <li key={k} className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><I className="h-5 w-5" /></span><span className="pt-2 text-muted"><T k={k} /></span></li>)}</ul>
        </div>
        <div>
          {profile ? <ApplyForm userId={profile.id} categories={cats.filter((c) => !c.id.startsWith('fallback'))} phone={profile.phone ?? ''} name={profile.full_name ?? ''} />
            : <div className="d-shape-sm border border-line bg-surface p-8 sm:p-10"><p className="text-lg"><T k="apply.login_first" /></p><div className="mt-6 flex gap-3"><Link href="/login?next=/become-a-worker" className="btn btn-primary"><T k="nav.login" /></Link><Link href="/signup?next=/become-a-worker" className="btn btn-outline"><T k="nav.signup" /></Link></div></div>}
        </div>
      </div>
    </div>
  );
}
