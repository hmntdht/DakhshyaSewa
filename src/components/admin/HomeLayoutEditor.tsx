'use client';
import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { saveLayoutAction } from '@/lib/admin/actions';
import { Notice, Spinner } from '../ui';
import { Bi } from '../Bi';
import { cn } from '@/lib/utils';
import type { HomeSectionId } from '@/lib/config/types';
import type { Msg } from '@/lib/config/types';

const LABEL: Record<HomeSectionId, string> = { services: 'Services list', how: 'How it works', tracking: 'Live tracking showcase', workers: 'Featured workers', offers: 'Offers & promo codes', testimonials: 'Testimonials', faq: 'FAQ', areas: 'Service areas', contact: 'Contact & enquiry form' };

export function HomeLayoutEditor({ initial }: { initial: { id: HomeSectionId; enabled: boolean }[] }) {
  const [list, setList] = useState(initial); const [pending, start] = useTransition(); const [res, setRes] = useState<{ ok: boolean; msg: Msg } | null>(null);
  const move = (i: number, d: -1 | 1) => setList((l) => { const n = [...l]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-muted">The hero and the closing call-to-action are fixed. Reorder or hide everything in between.</p>
      <ol className="space-y-2">{list.map((s, i) => (
        <li key={s.id} className={cn('flex items-center gap-3 rounded-app border p-3 pl-4', s.enabled ? 'border-line bg-surface' : 'border-line bg-surface/40 text-muted')}>
          <label className="flex flex-1 cursor-pointer items-center gap-3"><input type="checkbox" checked={s.enabled} onChange={(e) => setList(list.map((x) => (x.id === s.id ? { ...x, enabled: e.target.checked } : x)))} className="h-4 w-4 accent-[rgb(var(--c-primary))]" />{LABEL[s.id]}</label>
          <button type="button" className="btn btn-ghost btn-sm !p-2" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" className="btn btn-ghost btn-sm !p-2" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button></li>))}</ol>
      <button type="button" disabled={pending} className="btn btn-primary btn-lg" onClick={() => start(async () => { const r = await saveLayoutAction(JSON.stringify(list)); setRes(r.ok ? { ok: true, msg: r.message ?? { en: 'Saved', ne: 'सुरक्षित' } } : { ok: false, msg: r.error }); })}>{pending && <Spinner />}Save layout</button>
      {res && <Notice tone={res.ok ? 'success' : 'error'}><Bi v={res.msg} /></Notice>}
    </div>
  );
}
