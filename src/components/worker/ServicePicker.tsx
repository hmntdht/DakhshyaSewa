'use client';
import { useState } from 'react';
import { Bi } from '../Bi';
import { Icon } from '../Icon';
import { useT } from '../providers';
import { cn, rs } from '@/lib/utils';
import type { Category } from '@/types/db';

/** Checkbox + optional own rate per service. Serialises to a hidden JSON field the server action validates again. */
export function ServicePicker({ categories, initial }: { categories: Category[]; initial?: Record<string, number | null> }) {
  const t = useT();
  const [sel, setSel] = useState<Record<string, { on: boolean; rate: string }>>(() => Object.fromEntries(categories.map((c) => [c.id, { on: !!initial && c.id in initial, rate: initial?.[c.id] != null ? String(initial[c.id]) : '' }])));
  const json = JSON.stringify(categories.filter((c) => sel[c.id]?.on).map((c) => ({ category_id: c.id, rate: sel[c.id].rate === '' ? null : Number(sel[c.id].rate) })));
  return (
    <div className="space-y-2.5">
      <input type="hidden" name="services" value={json} />
      {categories.map((c) => { const s = sel[c.id]; return (
        <div key={c.id} className={cn('flex flex-wrap items-center gap-4 rounded-app border p-4 transition', s.on ? 'border-primary bg-primary/10' : 'border-line bg-surface')}>
          <label className="flex flex-1 cursor-pointer items-center gap-3"><input type="checkbox" checked={s.on} onChange={(e) => setSel({ ...sel, [c.id]: { ...s, on: e.target.checked } })} className="h-4 w-4 accent-[rgb(var(--c-primary))]" />
            <Icon name={c.icon} className="h-4 w-4 text-primary" /><span className="font-medium"><Bi en={c.name_en} ne={c.name_ne} /></span></label>
          {s.on && <label className="flex items-center gap-2 text-sm text-muted"><span>Rs</span><input type="number" min={0} max={100000} step={10} value={s.rate} placeholder={String(c.base_price)} onChange={(e) => setSel({ ...sel, [c.id]: { ...s, rate: e.target.value } })} className="field !w-28 !py-1.5" aria-label={`${c.name_en} rate`} /><span>{c.price_unit === 'hour' ? '/ hr' : ''}</span></label>}
          {!s.on && <span className="text-xs text-muted">{t('worker.base_rate')} {rs(c.base_price)}</span>}
        </div>); })}
    </div>
  );
}
