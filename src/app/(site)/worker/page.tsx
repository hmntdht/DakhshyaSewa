import Link from 'next/link';
import { CheckCircle2, ChevronRight, MapPin, X } from 'lucide-react';
import { requireWorker } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { setStatusAction } from '@/lib/booking/actions';
import { BarChart } from '@/components/charts/Charts';
import { RowAction } from '@/components/RowAction';
import { Bi } from '@/components/Bi';
import { T } from '@/components/T';
import { EmptyState, PageTitle, StatusBadge, Stars } from '@/components/ui';
import { fmtDateTime, isoToNpt, rs } from '@/lib/utils';
import type { Booking } from '@/types/db';

const LIVE = ['confirmed', 'en_route', 'arrived', 'in_progress'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function WorkerHome() {
  const { worker } = await requireWorker('/worker');
  const sb = await createClient();
  const { data } = await sb.from('bookings').select('*, service_categories(name_en,name_ne,icon,slug)').order('scheduled_start', { ascending: true }).limit(400);
  const all = (data ?? []) as Booking[];
  const requests = all.filter((b) => b.status === 'pending' && (b.payment_provider === 'cash' || b.payment_status === 'paid'));
  const live = all.filter((b) => LIVE.includes(b.status));
  const done = all.filter((b) => b.status === 'completed');
  const [y, m] = isoToNpt(new Date().toISOString()).date.split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, i) => { const mm = ((m - 1 - (5 - i) + 12) % 12) + 1; const yy = y - (m - 1 - (5 - i) < 0 ? 1 : 0); return { key: `${yy}-${String(mm).padStart(2, '0')}`, label: MONTHS[mm - 1], value: 0 }; });
  for (const b of done) { const s = months.find((x) => x.key === isoToNpt(b.completed_at ?? b.scheduled_start).date.slice(0, 7)); if (s) s.value += Number(b.worker_payout); }
  const total = done.reduce((s, b) => s + Number(b.worker_payout), 0);

  return (
    <>
      <PageTitle title={<><T k="worker.hello" /> {worker.display_name.split(' ')[0]}</>} sub={<Stars value={Number(worker.rating_avg)} count={worker.rating_count} size={16} />} />
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-app border border-line bg-line lg:grid-cols-4">
        {[['worker.stat.month', rs(months[5].value)], ['worker.stat.total', rs(total)], ['worker.stat.jobs', String(worker.jobs_completed)], ['worker.stat.rating', worker.rating_count ? Number(worker.rating_avg).toFixed(1) : '—']].map(([k, v]) => <div key={k} className="bg-surface p-5 sm:p-6"><dt className="text-xs text-muted"><T k={k} /></dt><dd className="mt-2 text-2xl font-light tracking-tight sm:text-3xl">{v}</dd></div>)}
      </dl>

      {requests.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-medium"><T k="worker.requests" /><span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-fg">{requests.length}</span></h2>
          <ul className="space-y-3">{requests.map((b) => (
            <li key={b.id} className="card flex flex-wrap items-center justify-between gap-4 border-primary/40 p-5">
              <Link href={`/worker/jobs/${b.id}`} className="min-w-0 flex-1">
                <p className="font-medium"><Bi en={b.service_categories?.name_en} ne={b.service_categories?.name_ne} /> · {b.customer_name}</p>
                <p className="text-sm text-muted">{fmtDateTime(b.scheduled_start)} · {b.duration_hours}h</p>
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted"><MapPin className="h-3 w-3" />{b.address_text}</p>
              </Link>
              <div className="flex items-center gap-3"><b className="text-lg">{rs(b.worker_payout)}</b>
                <RowAction action={setStatusAction.bind(null, b.id, 'confirmed', undefined)} className="btn-primary"><CheckCircle2 className="h-4 w-4" /><T k="worker.accept" /></RowAction>
                <RowAction action={setStatusAction.bind(null, b.id, 'declined', 'Declined by worker')} className="btn-outline" confirm="Decline this request?"><X className="h-4 w-4" /><T k="worker.decline" /></RowAction></div>
            </li>))}</ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-medium"><T k="worker.upcoming" /></h2>
        {live.length ? <ul className="space-y-3">{live.map((b) => (
          <li key={b.id}><Link href={`/worker/jobs/${b.id}`} className="group flex items-center gap-4 rounded-app border border-line bg-surface p-5 transition hover:border-primary/60">
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-3"><b className="font-medium"><Bi en={b.service_categories?.name_en} ne={b.service_categories?.name_ne} /></b><StatusBadge status={b.status} /></span>
              <span className="mt-1 block text-sm text-muted">{fmtDateTime(b.scheduled_start)} · {b.customer_name}</span><span className="block truncate text-xs text-muted">{b.address_text}</span></span>
            <b>{rs(b.worker_payout)}</b><ChevronRight className="h-5 w-5 text-muted group-hover:text-primary" /></Link></li>))}</ul>
          : <EmptyState title={<T k="worker.no_jobs" />} hint={<T k="worker.no_jobs_hint" />} />}
      </section>

      {done.length > 0 && <section className="mt-12 card p-6"><h2 className="mb-5 text-sm font-medium text-muted"><T k="worker.earnings" /></h2><BarChart data={months} format={(n) => rs(n).replace('Rs ', '')} /></section>}
    </>
  );
}
