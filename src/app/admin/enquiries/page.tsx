import { Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { setEnquiryStatusAction } from '@/lib/admin/actions';
import { RowAction } from '@/components/RowAction';
import { Badge, PageTitle } from '@/components/ui';
import { fmtDateTime, telHref } from '@/lib/utils';

export default async function AdminEnquiries() {
  const { data } = await (await createClient()).from('enquiries').select('*').order('created_at', { ascending: false }).limit(100);
  const rows = (data ?? []) as { id: string; name: string; phone: string; service: string | null; message: string | null; status: 'new' | 'contacted' | 'closed'; created_at: string }[];
  return (
    <>
      <PageTitle title="Enquiries" sub="People who used the contact form on the website. Call them back, then mark progress." />
      <div className="space-y-3">{rows.map((e) => (
        <article key={e.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-3 font-medium">{e.name}<Badge tone={e.status === 'new' ? 'pending' : e.status === 'contacted' ? 'confirmed' : 'completed'}>{e.status}</Badge></p>
            <a href={telHref(e.phone)} className="mt-1 inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"><Phone className="h-3.5 w-3.5" />{e.phone}</a>
            <p className="mt-1 text-xs text-muted">{fmtDateTime(e.created_at)}{e.service ? ` · ${e.service}` : ''}</p>{e.message && <p className="mt-3 text-sm text-muted">“{e.message}”</p>}</div>
          <div className="flex gap-2">{e.status !== 'contacted' && <RowAction action={setEnquiryStatusAction.bind(null, e.id, 'contacted')}>Mark contacted</RowAction>}{e.status !== 'closed' && <RowAction action={setEnquiryStatusAction.bind(null, e.id, 'closed')}>Close</RowAction>}</div>
        </article>))}
        {rows.length === 0 && <p className="card py-14 text-center text-muted">No enquiries yet.</p>}</div>
    </>
  );
}
