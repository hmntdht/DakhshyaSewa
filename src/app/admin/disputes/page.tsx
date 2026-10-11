import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { resolveDisputeAction } from '@/lib/admin/actions';
import { ActionForm, SubmitButton } from '@/components/form';
import { Badge, Field, PageTitle } from '@/components/ui';
import { fmtDateTime, rs } from '@/lib/utils';

interface D { id: string; booking_id: string; reason: string; details: string | null; status: string; resolution: string | null; created_at: string; bookings: { code: string; customer_name: string; total_amount: number; payment_status: string } | null; profiles: { full_name: string | null; role: string } | null }

export default async function AdminDisputes() {
  const sb = await createClient();
  const { data } = await sb.from('disputes').select('*, bookings(code,customer_name,total_amount,payment_status), profiles:opened_by(full_name,role)').order('created_at', { ascending: false }).limit(80);
  const rows = ((data ?? []) as unknown as D[]).sort((a, b) => Number(['resolved', 'rejected'].includes(a.status)) - Number(['resolved', 'rejected'].includes(b.status)));
  return (
    <>
      <PageTitle title="Disputes" sub="Complaints raised by customers or workers. Check the tracking trail and agreement on the booking before deciding." />
      <div className="space-y-4">{rows.map((d) => { const closed = ['resolved', 'rejected'].includes(d.status); return (
        <article key={d.id} className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex flex-wrap items-center gap-3 text-lg font-medium">{d.reason}<Badge tone={d.status}>{d.status.replace('_', ' ')}</Badge></h2>
            <p className="mt-1 text-xs text-muted">Opened by {d.profiles?.full_name ?? '—'} ({d.profiles?.role}) · {fmtDateTime(d.created_at)}</p></div>
            {d.bookings && <Link href={`/admin/bookings/${d.booking_id}`} className="btn btn-outline btn-sm"><span className="font-mono text-xs">{d.bookings.code}</span> · {rs(d.bookings.total_amount)} · {d.bookings.payment_status}</Link>}</div>
          {d.details && <p className="mt-4 whitespace-pre-wrap rounded-app bg-bg p-4 text-sm text-muted">{d.details}</p>}
          {closed ? <p className="mt-4 text-sm text-muted"><b className="text-fg">Resolution:</b> {d.resolution ?? '—'}</p> : (
            <ActionForm action={resolveDisputeAction} className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={d.id} /><input type="hidden" name="bookingId" value={d.booking_id} />
              <Field label="Resolution note (visible in the audit log)" className="sm:col-span-2"><textarea name="resolution" rows={2} maxLength={1500} defaultValue={d.resolution ?? ''} className="field resize-none" /></Field>
              <label className="flex items-center gap-2.5 text-sm text-muted"><input type="checkbox" name="refund" className="h-4 w-4 accent-[rgb(var(--c-primary))]" />Also mark the booking as refunded</label>
              <div className="flex flex-wrap items-center gap-2"><select name="status" defaultValue="under_review" className="field !w-44"><option value="under_review">Under review</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select><SubmitButton>Update</SubmitButton></div>
            </ActionForm>)}
        </article>); })}
        {rows.length === 0 && <p className="card py-14 text-center text-muted">No disputes. 🎉</p>}</div>
    </>
  );
}
