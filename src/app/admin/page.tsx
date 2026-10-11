import Link from 'next/link';
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BarChart, Donut, HBars, LineChart } from '@/components/charts/Charts';
import { Notice, PageTitle, Stars } from '@/components/ui';
import { cn, rs } from '@/lib/utils';

interface Dash {
  days: number;
  kpi: Record<string, number | null>;
  series: { date: string; bookings: number; revenue: number }[];
  by_category: { name: string; bookings: number; revenue: number }[];
  top_workers: { id: string; name: string; jobs: number; revenue: number; rating: number }[];
  status: Record<string, number>;
  cohorts: { cohort: string; size: number; retained: number[] }[];
}
const delta = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const sb = await createClient();
  const { data, error } = await sb.rpc('admin_dashboard', { p_days: days });
  if (error || !data) return <Notice tone="error">Could not load analytics: {error?.message}. Did you run migration 0005?</Notice>;
  const d = data as Dash; const k = d.kpi as Record<string, number>;
  const cards: { label: string; value: string; d?: number; sub?: string }[] = [
    { label: 'Completed value (GMV)', value: rs(k.gmv), d: delta(k.gmv, k.gmv_prev), sub: 'vs previous period' },
    { label: 'Platform revenue', value: rs(k.revenue), sub: 'commission on completed jobs' },
    { label: 'Bookings', value: String(k.bookings), d: delta(k.bookings, k.bookings_prev), sub: `${k.in_flight} in progress now` },
    { label: 'Completion rate', value: k.completion_rate == null ? '—' : `${k.completion_rate}%`, sub: `${k.completed} done · ${k.cancelled} cancelled` },
    { label: 'Average order', value: k.avg_order ? rs(k.avg_order) : '—' },
    { label: 'New customers', value: String(k.new_customers), sub: `${k.total_customers} in total` },
    { label: 'Repeat customers', value: k.repeat_rate == null ? '—' : `${k.repeat_rate}%`, sub: 'booked 2+ completed jobs' },
    { label: 'Active workers', value: String(k.active_workers), sub: `${k.pending_workers} awaiting approval` },
  ];
  const label = (iso: string) => { const [, m, dd] = iso.split('-'); return `${dd}/${m}`; };
  const rev = d.series.map((s) => ({ label: label(s.date), value: Number(s.revenue) })), bk = d.series.map((s) => ({ label: label(s.date), value: Number(s.bookings) }));
  const statuses = Object.entries(d.status).map(([label, value]) => ({ label: label.replace('_', ' '), value }));
  return (
    <>
      <PageTitle title="Dashboard" sub="Live numbers from the database. Day boundaries are Nepal time."
        action={<div className="flex rounded-full border border-line p-0.5 text-sm">{[7, 30, 90].map((n) => <Link key={n} href={`?days=${n}`} replace className={cn('rounded-full px-4 py-1.5 transition', days === n ? 'bg-fg text-bg' : 'text-muted hover:text-fg')}>{n}d</Link>)}</div>} />
      {(k.pending_workers > 0 || k.open_disputes > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {k.pending_workers > 0 && <Link href="/admin/workers?status=pending" className="flex items-center gap-2.5 rounded-app border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn"><AlertTriangle className="h-4 w-4" />{k.pending_workers} worker application(s) waiting</Link>}
          {k.open_disputes > 0 && <Link href="/admin/disputes" className="flex items-center gap-2.5 rounded-app border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad"><AlertTriangle className="h-4 w-4" />{k.open_disputes} open dispute(s)</Link>}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-app border border-line bg-line lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface p-5"><dt className="text-xs text-muted">{c.label}</dt>
            <dd className="mt-2 flex items-baseline gap-2 text-2xl font-light tracking-tight sm:text-3xl">{c.value}{c.d !== undefined && <span className={cn('inline-flex items-center text-xs font-medium', c.d >= 0 ? 'text-ok' : 'text-bad')}>{c.d >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(c.d).toFixed(0)}%</span>}</dd>
            {c.sub && <p className="mt-1 text-xs text-muted">{c.sub}</p>}</div>))}
      </dl>
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <section className="card p-6"><h2 className="mb-4 text-sm font-medium text-muted">Completed value per day (Rs)</h2><LineChart data={rev} format={(n) => rs(n).replace('Rs ', '')} /></section>
        <section className="card p-6"><h2 className="mb-4 text-sm font-medium text-muted">Bookings per day</h2>{days <= 30 ? <BarChart data={bk} format={String} /> : <LineChart data={bk} format={String} />}</section>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="card p-6"><h2 className="mb-5 text-sm font-medium text-muted">Revenue by service</h2>{d.by_category.length ? <HBars data={d.by_category.map((c) => ({ label: c.name, value: Number(c.revenue), hint: `${c.bookings} jobs` }))} format={(n) => rs(n)} /> : <p className="text-sm text-muted">No completed jobs in this period.</p>}</section>
        <section className="card p-6"><h2 className="mb-5 text-sm font-medium text-muted">Booking outcomes</h2>{statuses.length ? <Donut data={statuses} center={String(statuses.reduce((s, x) => s + x.value, 0))} /> : <p className="text-sm text-muted">No bookings yet.</p>}</section>
        <section className="card p-6"><h2 className="mb-4 text-sm font-medium text-muted">Top workers (by payout)</h2>
          {d.top_workers.length ? <ol className="space-y-3">{d.top_workers.map((w, i) => <li key={w.id} className="flex items-center gap-3 text-sm"><span className="w-5 text-muted">{i + 1}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{w.name}</span><span className="text-xs text-muted">{w.jobs} jobs · <Stars value={Number(w.rating)} /></span></span><b>{rs(w.revenue)}</b></li>)}</ol> : <p className="text-sm text-muted">No completed jobs yet.</p>}</section>
      </div>
      <section className="card mt-5 overflow-x-auto p-6"><h2 className="mb-1 text-sm font-medium text-muted">Customer retention</h2><p className="mb-5 text-xs text-muted">Of the customers whose first completed job was in the cohort month, the % who booked again in month +N.</p>
        {d.cohorts.length ? <table className="w-full min-w-[32rem] text-sm"><thead><tr className="text-left text-xs text-muted"><th className="py-2 pr-4 font-medium">Cohort</th><th className="px-2 font-medium">Size</th>{[0, 1, 2, 3, 4, 5].map((i) => <th key={i} className="px-2 text-center font-medium">+{i}</th>)}</tr></thead>
          <tbody>{d.cohorts.map((c) => <tr key={c.cohort} className="border-t border-line"><td className="py-2 pr-4 font-mono text-xs">{c.cohort}</td><td className="px-2">{c.size}</td>{c.retained.map((n, i) => { const pct = c.size ? (n / c.size) * 100 : 0; return <td key={i} className="px-1 py-1 text-center"><span className="block rounded py-1.5 text-xs" style={{ background: `rgb(var(--c-primary) / ${(pct / 100) * 0.7 + (n ? 0.08 : 0)})` }} title={`${n} of ${c.size}`}>{n || c.size ? `${pct.toFixed(0)}%` : ''}</span></td>; })}</tr>)}</tbody></table>
          : <p className="text-sm text-muted">Cohorts appear after customers complete their first jobs.</p>}</section>
    </>
  );
}
