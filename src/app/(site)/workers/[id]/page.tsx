import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Briefcase, CalendarDays, Clock, Languages, ShieldCheck } from 'lucide-react';
import { getCategories, getWorkerPublic, getWorkerReviews } from '@/lib/queries';
import { Avatar, Stars } from '@/components/ui';
import { Bi, pair } from '@/components/Bi';
import { T } from '@/components/T';
import { Icon } from '@/components/Icon';
import { fmtDate, to12h } from '@/lib/utils';

export const revalidate = 60;
type Props = { params: Promise<{ id: string }> };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = await getWorkerPublic((await params).id);
  return w ? { title: w.display_name, description: w.headline_en ?? undefined } : {};
}

export default async function WorkerPage({ params }: Props) {
  const { id } = await params;
  const [w, cats, reviews] = await Promise.all([getWorkerPublic(id), getCategories(), getWorkerReviews(id)]);
  if (!w) notFound();
  const services = w.worker_services.map((s) => ({ s, c: cats.find((c) => c.id === s.category_id) })).filter((x) => x.c);
  return (
    <div className="container-x py-12 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-6">
            <Avatar name={w.display_name} url={w.avatar_url} size={96} />
            <div>
              <h1 className="text-4xl font-light tracking-tight sm:text-5xl"><Bi en={w.display_name} ne={w.display_name_ne} /></h1>
              {w.headline_en && <p className="mt-2 text-lg text-muted"><Bi v={pair(w.headline_en, w.headline_ne)} /></p>}
              <div className="mt-3 flex flex-wrap items-center gap-4"><Stars value={Number(w.rating_avg)} count={w.rating_count} size={16} /><span className="chip border-ok/40 text-ok"><ShieldCheck className="h-3.5 w-3.5" /><T k="worker.verified" /></span></div>
            </div>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-app border border-line bg-line text-center">
            {[[w.jobs_completed, 'worker.jobs'], [w.experience_years, 'worker.years'], [w.languages.length, 'worker.languages']].map(([v, k]) => (
              <div key={k as string} className="bg-surface px-3 py-5"><dt className="order-2 text-xs text-muted"><T k={k as string} /></dt><dd className="text-3xl font-light">{v as number}</dd></div>
            ))}
          </dl>
          {w.bio_en && <div className="mt-10"><h2 className="mb-3 text-xl font-medium"><T k="worker.about" /></h2><p className="max-w-2xl leading-relaxed text-muted"><Bi v={pair(w.bio_en, w.bio_ne)} /></p></div>}
          <div className="mt-10 grid gap-3 text-sm text-muted sm:grid-cols-2">
            <p className="flex items-center gap-2.5"><Languages className="h-4 w-4 text-primary" />{w.languages.join(', ')}</p>
            <p className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-primary" />{to12h(w.work_start.slice(0, 5))} – {to12h(w.work_end.slice(0, 5))}</p>
            <p className="flex items-center gap-2.5 sm:col-span-2"><CalendarDays className="h-4 w-4 text-primary" />{DAYS.map((d, i) => <span key={d} className={w.available_days.includes(i) ? 'text-fg' : 'text-muted/40 line-through'}>{d}</span>).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, ' · ', x] : [x]), [])}</p>
          </div>
          <h2 className="mb-5 mt-14 text-2xl font-light tracking-tight"><T k="worker.reviews" /> {w.rating_count > 0 && <span className="text-muted">({w.rating_count})</span>}</h2>
          {reviews.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {reviews.map((r) => (
                <li key={r.id} className="py-5"><div className="flex items-center justify-between gap-4"><Stars value={r.rating} /><span className="text-xs text-muted">{fmtDate(r.created_at)}</span></div>
                  {r.comment && <p className="mt-2 text-muted">{r.comment}</p>}<p className="mt-1 text-xs text-muted">{r.reviewer_name ?? '—'}</p></li>
              ))}
            </ul>
          ) : <p className="text-muted"><T k="worker.no_reviews" /></p>}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="d-shape-sm border border-line bg-surface p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-medium"><Briefcase className="h-4 w-4 text-primary" /><T k="worker.services" /></h2>
            <ul className="mt-5 divide-y divide-line">
              {services.map(({ s, c }) => (
                <li key={c!.id} className="flex items-center justify-between gap-4 py-4">
                  <span className="flex items-center gap-3"><Icon name={c!.icon} className="h-4 w-4 text-primary" /><span><Bi en={c!.name_en} ne={c!.name_ne} /></span></span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <Bi en="Available" ne="उपलब्ध" />
                  </span>
                </li>
              ))}
            </ul>
            <Link href={`/book?worker=${w.id}${services[0] ? `&service=${services[0].c!.slug}` : ''}`} className="btn btn-primary btn-lg mt-6 w-full"><T k="worker.book_cta" /> {w.display_name.split(' ')[0]}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
