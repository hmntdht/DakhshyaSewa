import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { T } from '@/components/T';
import { Bi } from '@/components/Bi';
import { BarChart, Donut, HBars } from '@/components/charts/Charts';
import { BookingRow } from '@/components/dashboard/BookingRow';
import { EmptyState, PageTitle } from '@/components/ui';
import { isoToNpt, rs } from '@/lib/utils';
import type { Booking } from '@/types/db';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACTIVE = ['pending', 'confirmed', 'en_route', 'arrived', 'in_progress'];

export default async function DashboardHome() {
  const profile = await requireUser('/dashboard');
  const sb = await createClient();
  const { data } = await sb.from('bookings').select('*, service_categories(name_en,name_ne,icon,slug), workers(id,display_name,display_name_ne,avatar_url,rating_avg,user_id)').order('scheduled_start', { ascending: false }).limit(500);
  const all = (data ?? []) as Booking[];
  const done = all.filter((b) => b.status === 'completed');
  const upcoming = all.filter((b) => ACTIVE.includes(b.status)).sort((a, b) => +new Date(a.scheduled_start) - +new Date(b.scheduled_start));
  const spent = done.reduce((s, b) => s + Number(b.total_amount), 0);
  const hours = done.reduce((s, b) => s + Number(b.duration_hours), 0);

  // last 6 Nepal-calendar months
  const now = isoToNpt(new Date().toISOString()).date; let [y, m] = now.split('-').map(Number);
  const months: { key: string; label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) { const mm = ((m - 1 - i + 12) % 12) + 1, yy = y - (m - 1 - i < 0 ? 1 : 0); months.push({ key: `${yy}-${String(mm).padStart(2, '0')}`, label: MONTHS[mm - 1], value: 0 }); }
  for (const b of done) { const k = isoToNpt(b.scheduled_start).date.slice(0, 7); const slot = months.find((x) => x.key === k); if (slot) slot.value += Number(b.total_amount); }
  const byService = new Map<string, { label: string; value: number; n: number }>();
  for (const b of done) { const k = b.service_categories?.name_en ?? '—'; const e = byService.get(k) ?? { label: k, value: 0, n: 0 }; e.value += Number(b.total_amount); e.n += 1; byService.set(k, e); }
  const services = [...byService.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  const statusCounts = ['completed', 'cancelled', 'declined'].map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: all.filter((b) => b.status === s).length })).filter((x) => x.value > 0);

  const stats: [string, string][] = [['dash.stat.spent', rs(spent)], ['dash.stat.done', String(done.length)], ['dash.stat.hours', hours ? `${Number(hours.toFixed(1))}` : '0'], ['dash.stat.avg', done.length ? rs(spent / done.length) : '—']];
  return (
    <>
      <PageTitle title={<>{<T k="dash.hello" />}, {(profile.full_name ?? '').split(' ')[0] || '👋'}</>} sub={<T k="dash.sub" />} action={<Link href="/book" className="btn btn-primary"><T k="nav.book" /></Link>} />
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-app border border-line bg-line lg:grid-cols-4">
        {stats.map(([k, v]) => <div key={k} className="bg-surface p-5 sm:p-6"><dt className="text-xs text-muted"><T k={k} /></dt><dd className="mt-2 text-2xl font-light tracking-tight sm:text-3xl">{v}</dd></div>)}
      </dl>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-medium"><T k="dash.upcoming" /></h2>
        {upcoming.length ? <ul className="space-y-3">{upcoming.slice(0, 4).map((b) => <BookingRow key={b.id} b={b} />)}</ul>
          : <EmptyState title={<T k="dash.no_upcoming" />} action={<Link href="/book" className="btn btn-primary"><T k="nav.book" /></Link>} />}
      </section>

      {done.length > 0 && (
        <section className="mt-14 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="card p-6"><h2 className="mb-5 text-sm font-medium text-muted"><T k="dash.spend_chart" /></h2><BarChart data={months} format={(n) => rs(n).replace('Rs ', '')} /></div>
          <div className="card space-y-8 p-6">
            <div><h2 className="mb-5 text-sm font-medium text-muted"><T k="dash.by_service" /></h2><HBars data={services.map((s) => ({ label: s.label, value: s.value, hint: `${s.n}×` }))} format={(n) => rs(n)} /></div>
            {statusCounts.length > 1 && <Donut data={statusCounts} center={String(all.length)} />}
          </div>
        </section>
      )}
      {all.length > 0 && <p className="mt-10 text-sm"><Link href="/dashboard/bookings" className="text-primary underline-offset-4 hover:underline"><Bi en="View all bookings" ne="सबै बुकिङ हेर्नुहोस्" /></Link></p>}
    </>
  );
}
