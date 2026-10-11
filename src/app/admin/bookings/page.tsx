import Link from 'next/link';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge, PageTitle, StatusBadge } from '@/components/ui';
import { cn, fmtDateTime, rs } from '@/lib/utils';
import type { Booking } from '@/types/db';

const STATUSES = ['pending', 'confirmed', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'declined'];
const PAGE = 25;

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams; const page = Math.max(1, Number(sp.page) || 1); const q = (sp.q ?? '').replace(/[%,()*]/g, '').trim().slice(0, 30);
  const sb = await createClient();
  let query = sb.from('bookings').select('id,code,status,scheduled_start,total_amount,payment_provider,payment_status,customer_name,service_categories(name_en),workers(display_name)', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.status && STATUSES.includes(sp.status)) query = query.eq('status', sp.status);
  if (q) query = query.or(`code.ilike.%${q}%,customer_name.ilike.%${q}%`);
  const { data, count } = await query; const rows = (data ?? []) as unknown as (Booking & { service_categories: { name_en: string }; workers: { display_name: string } })[];
  const href = (p: Record<string, string | number | undefined>) => { const u = new URLSearchParams(Object.entries({ status: sp.status, q: q || undefined, ...p }).filter(([, v]) => v !== undefined && v !== '') as [string, string][]); return `?${u}`; };
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  return (
    <>
      <PageTitle title="Bookings" sub={`${count ?? 0} found`} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form className="relative min-w-60 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input name="q" defaultValue={q} placeholder="Booking code or customer" className="field pl-9" />{sp.status && <input type="hidden" name="status" value={sp.status} />}</form>
        <div className="flex flex-wrap gap-1.5 text-xs">{[undefined, ...STATUSES].map((s) => <Link key={s ?? 'all'} href={href({ status: s, page: 1 })} className={cn('rounded-full border px-3 py-1.5 transition', (sp.status ?? undefined) === s ? 'border-primary bg-primary/15 text-primary' : 'border-line text-muted hover:text-fg')}>{s ? s.replace('_', ' ') : 'all'}</Link>)}</div>
      </div>
      <div className="overflow-x-auto rounded-app border border-line"><table className="w-full min-w-[52rem] text-sm"><thead className="border-b border-line bg-surface"><tr>{['Code', 'Service', 'Customer', 'Worker', 'When', 'Total', 'Payment', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map((b) => (
          <tr key={b.id} className="hover:bg-fg/[.03]"><td className="td"><Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs text-primary underline-offset-4 hover:underline">{b.code}</Link></td><td className="td">{b.service_categories?.name_en}</td><td className="td">{b.customer_name}</td><td className="td">{b.workers?.display_name}</td><td className="td whitespace-nowrap">{fmtDateTime(b.scheduled_start)}</td><td className="td font-medium">{rs(b.total_amount)}</td><td className="td"><span className="mr-1.5 capitalize text-muted">{b.payment_provider}</span><Badge tone={b.payment_status}>{b.payment_status}</Badge></td><td className="td"><StatusBadge status={b.status} /></td></tr>))}
          {rows.length === 0 && <tr><td colSpan={8} className="td py-12 text-center text-muted">No bookings match.</td></tr>}</tbody></table></div>
      {pages > 1 && <div className="mt-5 flex items-center justify-between text-sm text-muted"><span>Page {page} of {pages}</span><div className="flex gap-2">{page > 1 && <Link className="btn btn-outline btn-sm" href={href({ page: page - 1 })}>Previous</Link>}{page < pages && <Link className="btn btn-outline btn-sm" href={href({ page: page + 1 })}>Next</Link>}</div></div>}
    </>
  );
}
