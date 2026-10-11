'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { deleteResourceAction, saveResourceAction } from '@/lib/admin/actions';
import { FieldInput } from './FieldInput';
import { Badge, Notice, Spinner } from '../ui';
import { Bi } from '../Bi';
import { fmtDate, rs } from '@/lib/utils';
import type { ResourceDef } from '@/lib/admin/resources';
import type { Msg } from '@/lib/config/types';

type Row = Record<string, unknown>;

function Cell({ kind, v }: { kind?: string; v: unknown }) {
  if (v === null || v === undefined || v === '') return <span className="text-muted">—</span>;
  switch (kind) {
    case 'bool': return v ? <Check className="h-4 w-4 text-ok" /> : <X className="h-4 w-4 text-muted" />;
    case 'money': return <>{rs(v as number)}</>;
    case 'date': return <>{fmtDate(String(v))}</>;
    case 'badge': return <Badge>{String(v)}</Badge>;
    case 'mono': return <code className="rounded bg-fg/10 px-1.5 py-0.5 font-mono text-xs">{String(v)}</code>;
    default: return <span className="line-clamp-2">{String(v)}</span>;
  }
}

export function ResourceManager({ def, rows, lookups }: { def: ResourceDef; rows: Row[]; lookups: Record<string, { value: string; label: string }[]> }) {
  const router = useRouter(); const [pending, start] = useTransition();
  const [open, setOpen] = useState<null | { row: Row | null }>(null); const [err, setErr] = useState<Msg | null>(null);
  const editing = open?.row ?? null; const idOf = (r: Row) => String(r[def.pk]);

  function submit(fd: FormData) {
    start(async () => { setErr(null); const r = await saveResourceAction(def.key, editing ? idOf(editing) : null, fd); if (!r.ok) setErr(r.error); else { setOpen(null); router.refresh(); } });
  }
  function remove(r: Row) {
    if (!window.confirm(`Delete this ${def.singular}? This cannot be undone.`)) return;
    start(async () => { const x = await deleteResourceAction(def.key, idOf(r)); if (!x.ok) window.alert(x.error.en); else router.refresh(); });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><p className="max-w-2xl text-sm text-muted">{def.hint}</p>
        <button type="button" className="btn btn-primary" onClick={() => { setErr(null); setOpen({ row: null }); }}><Plus className="h-4 w-4" />Add {def.singular}</button></div>
      <div className="overflow-x-auto rounded-app border border-line">
        <table className="w-full min-w-[34rem] text-sm"><thead className="border-b border-line bg-surface"><tr>{def.columns.map((c) => <th key={c.name} className="th">{c.label}</th>)}<th className="th w-28" /></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => <tr key={idOf(r)} className="hover:bg-fg/[.03]">{def.columns.map((c) => <td key={c.name} className="td"><Cell kind={c.kind} v={r[c.name]} /></td>)}
              <td className="td"><div className="flex justify-end gap-1"><button type="button" aria-label="Edit" className="btn btn-ghost btn-sm !p-2" onClick={() => { setErr(null); setOpen({ row: r }); }}><Pencil className="h-4 w-4" /></button><button type="button" aria-label="Delete" className="btn btn-ghost btn-sm !p-2 hover:!text-bad" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}
            {rows.length === 0 && <tr><td colSpan={def.columns.length + 1} className="td py-12 text-center text-muted">Nothing here yet.</td></tr>}
          </tbody></table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-10" role="dialog" aria-modal="true" aria-label={`${editing ? 'Edit' : 'Add'} ${def.singular}`}>
          <form action={submit} key={editing ? idOf(editing) : 'new'} className="w-full max-w-3xl rounded-app border border-line bg-bg p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-light">{editing ? 'Edit' : 'Add'} {def.singular}</h2><button type="button" className="btn btn-ghost !p-2" aria-label="Close" onClick={() => setOpen(null)}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-5 sm:grid-cols-2">{def.fields.map((f) => <FieldInput key={f.name} f={f} editing={!!editing} lookups={lookups} value={editing ? editing[f.name] : def.defaults?.[f.name]} />)}</div>
            {err && <Notice tone="error" className="mt-5"><Bi v={err} /></Notice>}
            <div className="mt-7 flex justify-end gap-3"><button type="button" className="btn btn-ghost" onClick={() => setOpen(null)}>Cancel</button><button disabled={pending} className="btn btn-primary">{pending && <Spinner />}Save</button></div>
          </form>
        </div>
      )}
    </>
  );
}
