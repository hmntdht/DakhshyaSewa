import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookingAdminActions } from '@/components/admin/BookingAdminActions';
import { StatusTimeline } from '@/components/dashboard/StatusTimeline';
import { createClient } from '@/lib/supabase/server';
import { Badge, PageTitle, StatusBadge } from '@/components/ui';
import { fmtDateLong, fmtDateTime, fmtTime, rs } from '@/lib/utils';
import type { Booking } from '@/types/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminBooking({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!UUID.test(id)) notFound();
  const sb = await createClient();
  const { data } = await sb.from('bookings').select('*, service_categories(name_en), workers(id,display_name)').eq('id', id).maybeSingle();
  const b = data as (Booking & { service_categories: { name_en: string }; workers: { id: string; display_name: string } }) | null;
  if (!b) notFound();
  const [pay, pings, loc, secret, disputes, contacts] = await Promise.all([
    sb.from('payments').select('*').eq('booking_id', id).order('created_at'), sb.from('tracking_pings').select('id', { count: 'exact', head: true }).eq('booking_id', id),
    sb.from('live_locations').select('*').eq('booking_id', id).maybeSingle(), sb.from('booking_secrets').select('start_pin,attempts,pin_verified_at').eq('booking_id', id).maybeSingle(),
    sb.from('disputes').select('id,reason,status').eq('booking_id', id), sb.rpc('get_booking_contacts', { p_booking_id: id }),
  ]);
  const c = (contacts.data ?? {}) as { customer_phone?: string; worker_phone?: string };
  const S = secret.data as { start_pin: string; attempts: number; pin_verified_at: string | null } | null;
  const paid = b.payment_status === 'paid';
  return (
    <>
      <PageTitle title={<span className="flex flex-wrap items-center gap-3"><span className="font-mono text-2xl">{b.code}</span><StatusBadge status={b.status} /></span>} sub={`${b.service_categories?.name_en} · ${fmtDateLong(b.scheduled_start)}, ${fmtTime(b.scheduled_start)}`} action={<Link href="/admin/bookings" className="btn btn-outline btn-sm">Back to list</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card space-y-4 p-6 text-sm"><h2 className="font-medium">Admin actions</h2><BookingAdminActions id={b.id} status={b.status} canRefund={paid} /></section>
          <section className="card p-6 text-sm"><h2 className="mb-4 font-medium">Details</h2>
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {[['Customer', `${b.customer_name}${c.customer_phone ? ` · ${c.customer_phone}` : ''}`], ['Worker', b.workers ? `${b.workers.display_name}${c.worker_phone ? ` · ${c.worker_phone}` : ''}` : '—'], ['Address', b.address_text + (b.landmark ? ` (${b.landmark})` : '')], ['Coordinates', `${b.lat.toFixed(5)}, ${b.lng.toFixed(5)}`], ['Duration', `${b.duration_hours} h`], ['Notes', b.notes ?? '—'], ['Start PIN (support only)', S ? `${S.start_pin} · ${S.attempts} wrong tries${S.pin_verified_at ? ' · verified' : ''}` : '—'], ['Tracking', `${pings.count ?? 0} breadcrumbs${loc.data ? ' · live now' : ''}`]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>)}
            </dl>
            <a className="mt-4 inline-block text-primary underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${b.lat}&mlon=${b.lng}#map=17/${b.lat}/${b.lng}`}>Open the pin on a map</a></section>
          <section className="card p-6 text-sm"><h2 className="mb-4 font-medium">Signed agreement</h2><p className="text-xs text-muted">{b.signed_name} · {fmtDateTime(b.signed_at)} · SHA-256 <span className="font-mono">{b.contract_hash}</span></p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-app bg-bg p-4 font-sans text-xs leading-relaxed text-muted">{b.contract_snapshot}</pre></section>
        </div>
        <div className="space-y-6">
          <section className="card p-6 text-sm"><h2 className="mb-4 font-medium">Money</h2>
            <dl className="space-y-2"><div className="flex justify-between text-muted"><dt>Subtotal</dt><dd>{rs(b.subtotal)}</dd></div>{Number(b.discount_amount) > 0 && <div className="flex justify-between text-ok"><dt>Discount</dt><dd>− {rs(b.discount_amount)}</dd></div>}{Number(b.vat_amount) > 0 && <div className="flex justify-between text-muted"><dt>VAT</dt><dd>{rs(b.vat_amount)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Customer pays</dt><dd>{rs(b.total_amount)}</dd></div><div className="flex justify-between text-muted"><dt>Commission ({b.commission_rate}%)</dt><dd>{rs(b.commission_amount)}</dd></div><div className="flex justify-between text-muted"><dt>Worker payout</dt><dd>{rs(b.worker_payout)}</dd></div></dl>
            <h3 className="mb-2 mt-6 text-xs font-medium text-muted">Payment attempts</h3>
            <ul className="space-y-2">{(pay.data ?? []).map((p: { id: string; provider: string; status: string; amount: number; provider_ref: string | null; created_at: string }) => <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"><span><span className="capitalize">{p.provider}</span> <span className="text-xs text-muted">{fmtDateTime(p.created_at)}</span>{p.provider_ref && <span className="block font-mono text-[10px] text-muted">{p.provider_ref}</span>}</span><Badge tone={p.status}>{p.status}</Badge></li>)}</ul></section>
          <section className="card p-6"><h2 className="mb-4 text-sm font-medium">Timeline</h2><StatusTimeline b={b} /></section>
          {(disputes.data ?? []).length > 0 && <section className="card p-6 text-sm"><h2 className="mb-3 font-medium">Disputes</h2>{(disputes.data as { id: string; reason: string; status: string }[]).map((d) => <p key={d.id} className="flex items-center justify-between gap-3"><span>{d.reason}</span><Badge tone={d.status}>{d.status}</Badge></p>)}<Link href="/admin/disputes" className="mt-3 inline-block text-primary underline-offset-4 hover:underline">Open disputes</Link></section>}
        </div>
      </div>
    </>
  );
}
