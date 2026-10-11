import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BookingRow } from '@/components/dashboard/BookingRow';
import { T } from '@/components/T';
import { EmptyState, PageTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Booking } from '@/types/db';

const ACTIVE = ['pending', 'confirmed', 'en_route', 'arrived', 'in_progress'];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === 'past' ? 'past' : 'upcoming';
  const sb = await createClient();
  const { data } = await sb.from('bookings').select('*, service_categories(name_en,name_ne,icon,slug), workers(id,display_name,display_name_ne,avatar_url,rating_avg,user_id)').order('scheduled_start', { ascending: tab === 'upcoming' }).limit(200);
  const rows = ((data ?? []) as Booking[]).filter((b) => (tab === 'upcoming') === ACTIVE.includes(b.status));
  return (
    <>
      <PageTitle title={<T k="dash.bookings" />} action={<div className="flex rounded-full border border-line p-0.5 text-sm">{(['upcoming', 'past'] as const).map((k) => <Link key={k} href={`?tab=${k}`} replace className={cn('rounded-full px-4 py-1.5 transition', tab === k ? 'bg-fg text-bg' : 'text-muted hover:text-fg')}><T k={`dash.tab.${k}`} /></Link>)}</div>} />
      {rows.length ? <ul className="space-y-3">{rows.map((b) => <BookingRow key={b.id} b={b} />)}</ul> : <EmptyState title={<T k={tab === 'upcoming' ? 'dash.no_upcoming' : 'dash.no_past'} />} action={tab === 'upcoming' ? <Link href="/book" className="btn btn-primary"><T k="nav.book" /></Link> : undefined} />}
    </>
  );
}
