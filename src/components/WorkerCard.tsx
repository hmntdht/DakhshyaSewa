import Link from 'next/link';
import { Briefcase, Languages } from 'lucide-react';
import { Avatar, Stars } from './ui';
import { Bi, pair } from './Bi';
import { T } from './T';
import { rs } from '@/lib/utils';
import type { Category, Worker } from '@/types/db';

export function WorkerCard({ worker, categories, rate, unit, serviceSlug, className }: {
  worker: Worker; categories: Category[]; rate?: number | null; unit?: 'hour' | 'fixed'; serviceSlug?: string; className?: string;
}) {
  const own = worker.worker_services ?? [];
  const names = own.map((s) => categories.find((c) => c.id === s.category_id)).filter(Boolean) as Category[];
  const first = serviceSlug ? categories.find((c) => c.slug === serviceSlug) : names[0];
  const price = rate ?? (first ? own.find((s) => s.category_id === first.id)?.rate ?? first.base_price : null);
  const priceUnit = unit ?? first?.price_unit;
  return (
    <article className={`card flex h-full flex-col p-5 transition hover:border-primary/50 ${className ?? ''}`}>
      <div className="flex items-start gap-3.5">
        <Avatar name={worker.display_name} url={worker.avatar_url} size={56} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold leading-tight"><Bi en={worker.display_name} ne={worker.display_name_ne} /></h3>
          {worker.headline_en && <p className="mt-0.5 line-clamp-1 text-sm text-muted"><Bi v={pair(worker.headline_en, worker.headline_ne)} /></p>}
          <div className="mt-1.5"><Stars value={Number(worker.rating_avg)} count={worker.rating_count} /></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {names.slice(0, 3).map((c) => <span key={c.id} className="chip"><Bi en={c.name_en} ne={c.name_ne} /></span>)}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
        <div className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /><span>{worker.experience_years} <T k="worker.years" /></span></div>
        <div className="flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" /><span className="truncate">{worker.languages.slice(0, 2).join(', ')}</span></div>
      </dl>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <p className="text-sm">
          {price != null && <><span className="text-xs text-muted"><T k="common.from" /> </span><span className="text-lg font-semibold">{rs(price)}</span>{priceUnit === 'hour' && <span className="text-xs text-muted"> / <T k="common.hour" /></span>}</>}
        </p>
        <div className="flex gap-2">
          <Link href={`/workers/${worker.id}`} className="btn btn-outline btn-sm"><T k="common.profile" /></Link>
          <Link href={`/book?worker=${worker.id}${first ? `&service=${first.slug}` : ''}`} className="btn btn-primary btn-sm"><T k="common.book" /></Link>
        </div>
      </div>
    </article>
  );
}
