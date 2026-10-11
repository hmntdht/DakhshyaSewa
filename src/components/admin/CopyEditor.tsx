'use client';
import { useMemo, useState, useTransition } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { saveCopyAction } from '@/lib/admin/actions';
import { Notice, Spinner } from '../ui';
import { Bi } from '../Bi';
import type { Msg } from '@/lib/config/types';

/** Every visible string on the public site and customer/worker apps, in English + Nepali. Only edited strings are stored. */
export function CopyEditor({ defaults, initial }: { defaults: Record<string, Msg>; initial: Record<string, Msg> }) {
  const [vals, setVals] = useState<Record<string, Msg>>(() => ({ ...defaults, ...initial }));
  const [q, setQ] = useState(''); const [pending, start] = useTransition(); const [res, setRes] = useState<{ ok: boolean; msg: Msg } | null>(null);
  const keys = useMemo(() => Object.keys(defaults).sort(), [defaults]);
  const changed = (k: string) => vals[k].en !== defaults[k].en || vals[k].ne !== defaults[k].ne;
  const nChanged = keys.filter(changed).length;
  const shown = keys.filter((k) => !q || k.includes(q.toLowerCase()) || vals[k].en.toLowerCase().includes(q.toLowerCase()) || vals[k].ne.includes(q));
  const groups = useMemo(() => { const m = new Map<string, string[]>(); shown.forEach((k) => { const g = k.split('.')[0]; m.set(g, [...(m.get(g) ?? []), k]); }); return [...m.entries()]; }, [shown]);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 bg-bg/90 px-1 py-3 backdrop-blur">
        <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search text or key, e.g. “book” or “cancel”" className="field pl-9" /></div>
        <span className="text-sm text-muted">{nChanged} customised</span>
        <button type="button" disabled={pending} className="btn btn-primary" onClick={() => start(async () => { const r = await saveCopyAction(JSON.stringify(vals)); setRes(r.ok ? { ok: true, msg: r.message ?? { en: 'Saved', ne: 'सुरक्षित' } } : { ok: false, msg: r.error }); })}>{pending && <Spinner />}Save all</button>
      </div>
      {res && <Notice tone={res.ok ? 'success' : 'error'}><Bi v={res.msg} /></Notice>}
      {groups.map(([g, ks]) => (
        <details key={g} open={!!q || g === 'nav'} className="rounded-app border border-line">
          <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium capitalize">{g} <span className="text-muted">({ks.length})</span></summary>
          <div className="divide-y divide-line border-t border-line">{ks.map((k) => (
            <div key={k} className="grid gap-3 p-4 lg:grid-cols-[14rem_1fr_1fr_auto] lg:items-start">
              <code className="break-all text-xs text-muted">{k}</code>
              <textarea rows={vals[k].en.length > 70 ? 3 : 1} value={vals[k].en} maxLength={500} onChange={(e) => setVals({ ...vals, [k]: { ...vals[k], en: e.target.value } })} className="field resize-y" aria-label={`${k} English`} />
              <textarea rows={vals[k].ne.length > 70 ? 3 : 1} value={vals[k].ne} maxLength={500} lang="ne" onChange={(e) => setVals({ ...vals, [k]: { ...vals[k], ne: e.target.value } })} className="field font-ne resize-y" aria-label={`${k} Nepali`} />
              <button type="button" disabled={!changed(k)} onClick={() => setVals({ ...vals, [k]: defaults[k] })} className="btn btn-ghost btn-sm !p-2" aria-label="Reset to default" title="Reset to default"><RotateCcw className="h-4 w-4" /></button>
            </div>))}</div>
        </details>
      ))}
    </div>
  );
}
