import Link from 'next/link';
import { FileText, ImageIcon, Phone, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { featureWorkerAction, reviewWorkerAction, setCommissionAction } from '@/lib/admin/actions';
import { ActionForm, SubmitButton } from '@/components/form';
import { RowAction } from '@/components/RowAction';
import { Avatar, Badge, PageTitle, Stars } from '@/components/ui';
import { cn } from '@/lib/utils';

const TABS = ['pending', 'approved', 'suspended', 'rejected', 'all'] as const;
type Priv = { phone: string | null; citizenship_no: string | null; id_doc_path: string | null; selfie_path: string | null; address: string | null; payout_method: string | null };
interface W { id: string; display_name: string; headline_en: string | null; avatar_url: string | null; experience_years: number; rating_avg: number; rating_count: number; jobs_completed: number; status: string; is_featured: boolean; commission_override: number | null; created_at: string; worker_private: Priv | Priv[] | null; worker_services: { service_categories: { name_en: string } | null }[] }

export default async function AdminWorkers({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams; const tab = (TABS as readonly string[]).includes(sp.status ?? '') ? sp.status! : 'pending';
  const sb = await createClient();
  let q = sb.from('workers').select('*, worker_private(phone,citizenship_no,id_doc_path,selfie_path,address,payout_method), worker_services(service_categories(name_en))').order('created_at', { ascending: false }).limit(60);
  if (tab !== 'all') q = q.eq('status', tab);
  const [{ data }, counts] = await Promise.all([q, sb.from('workers').select('status')]);
  const rows = (data ?? []) as unknown as W[];
  const priv = (w: W) => (Array.isArray(w.worker_private) ? w.worker_private[0] : w.worker_private) ?? null;
  const paths = rows.flatMap((w) => [priv(w)?.id_doc_path, priv(w)?.selfie_path]).filter(Boolean) as string[];
  const signed = new Map<string, string>();
  if (paths.length) { const { data: s } = await sb.storage.from('worker-docs').createSignedUrls(paths, 300); s?.forEach((x) => { if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl); }); }   // 5-minute private links
  const n = (s: string) => (counts.data ?? []).filter((c: { status: string }) => s === 'all' || c.status === s).length;
  return (
    <>
      <PageTitle title="Workers" sub="Approve applications after checking the ID and selfie. Approval opens the worker portal and lists them on the site." />
      <div className="mb-6 flex flex-wrap gap-1.5 text-sm">{TABS.map((t) => <Link key={t} href={`?status=${t}`} className={cn('rounded-full border px-4 py-1.5 capitalize transition', tab === t ? 'border-primary bg-primary/15 text-primary' : 'border-line text-muted hover:text-fg')}>{t} <span className="opacity-60">{n(t)}</span></Link>)}</div>
      <div className="space-y-4">{rows.map((w) => { const p = priv(w); return (
        <article key={w.id} className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={w.display_name} url={w.avatar_url} size={56} />
            <div className="min-w-0 flex-1"><h2 className="flex flex-wrap items-center gap-3 text-lg font-medium">{w.display_name}<Badge tone={w.status}>{w.status}</Badge>{w.is_featured && <Badge tone="confirmed"><Star className="mr-1 h-3 w-3" />Featured</Badge>}</h2>
              {w.headline_en && <p className="text-sm text-muted">{w.headline_en}</p>}
              <p className="mt-1 text-xs text-muted">{w.experience_years} yrs · {w.jobs_completed} jobs · <Stars value={Number(w.rating_avg)} count={w.rating_count} /></p>
              <div className="mt-2 flex flex-wrap gap-1.5">{w.worker_services.map((s, i) => <span key={i} className="chip">{s.service_categories?.name_en}</span>)}</div></div>
            <div className="flex flex-wrap gap-2">
              {w.status !== 'approved' && <RowAction action={reviewWorkerAction.bind(null, w.id, 'approved')} className="btn-primary">Approve</RowAction>}
              {w.status === 'pending' && <RowAction action={reviewWorkerAction.bind(null, w.id, 'rejected')} className="btn-danger" confirm="Reject this application?">Reject</RowAction>}
              {w.status === 'approved' && <RowAction action={reviewWorkerAction.bind(null, w.id, 'suspended')} className="btn-danger" confirm="Suspend this worker? They disappear from the site immediately.">Suspend</RowAction>}
              {w.status === 'approved' && <RowAction action={featureWorkerAction.bind(null, w.id, !w.is_featured)}>{w.is_featured ? 'Unfeature' : 'Feature on home'}</RowAction>}</div>
          </div>
          {p && (
            <div className="mt-5 grid gap-4 border-t border-line pt-5 text-sm lg:grid-cols-[1fr_auto] lg:items-end">
              <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2"><div><dt className="text-xs text-muted">Phone</dt><dd className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary" />{p.phone ?? '—'}</dd></div><div><dt className="text-xs text-muted">Citizenship no.</dt><dd>{p.citizenship_no ?? '—'}</dd></div><div><dt className="text-xs text-muted">Address</dt><dd>{p.address ?? '—'}</dd></div><div><dt className="text-xs text-muted">Payout via</dt><dd>{p.payout_method ?? '—'}</dd></div></dl>
              <div className="flex flex-wrap gap-2">
                {p.id_doc_path && signed.get(p.id_doc_path) && <a className="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href={signed.get(p.id_doc_path)}><FileText className="h-4 w-4" />ID document</a>}
                {p.selfie_path && signed.get(p.selfie_path) && <a className="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href={signed.get(p.selfie_path)}><ImageIcon className="h-4 w-4" />Selfie</a>}</div>
            </div>
          )}
          <ActionForm action={setCommissionAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4 text-sm"><input type="hidden" name="id" value={w.id} />
            <label className="block"><span className="label">Personal commission % (empty = platform default)</span><input name="pct" type="number" step="0.5" min={0} max={100} defaultValue={w.commission_override ?? ''} className="field !w-40" /></label><SubmitButton className="btn-outline btn-sm">Save</SubmitButton></ActionForm>
        </article>); })}
        {rows.length === 0 && <p className="card py-14 text-center text-muted">No workers in this tab.</p>}</div>
    </>
  );
}
