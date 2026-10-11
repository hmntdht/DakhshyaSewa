import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategories, getCategoryBySlug, getWorkersForCategory, type WorkerSort } from '@/lib/queries';
import { Bi } from '@/components/Bi';
import { T } from '@/components/T';
import { Icon } from '@/components/Icon';
import { WorkerCard } from '@/components/WorkerCard';
import { EmptyState } from '@/components/ui';
import { cn, rs } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategoryBySlug((await params).slug);
  return c ? { title: c.name_en, description: c.description_en ?? c.tagline_en ?? undefined } : {};
}

const SORTS: [WorkerSort, string][] = [['rating', 'sort.rating'], ['price', 'sort.price'], ['experience', 'sort.experience']];

export default async function ServicePage({ params, searchParams }: Props) {
  const [{ slug }, { sort }] = await Promise.all([params, searchParams]);
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const key: WorkerSort = SORTS.some(([k]) => k === sort) ? (sort as WorkerSort) : 'rating';
  const [workers, cats] = await Promise.all([getWorkersForCategory(cat.id, key), getCategories()]);
  const kids = cats.filter((c) => c.parent_id === cat.id);
  return (
    <>
      <section className="hero-lines border-b border-line">
        <div className="container-x grid gap-8 py-14 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary"><Icon name={cat.icon} className="h-6 w-6" /></span>
            <h1 className="mt-6 text-balance text-4xl font-light tracking-tight sm:text-6xl"><Bi en={cat.name_en} ne={cat.name_ne} /></h1>
            {cat.name_ne && <p data-l="en" lang="ne" className="font-ne mt-2 text-2xl font-extrabold text-primary">{cat.name_ne}</p>}
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted"><Bi en={cat.description_en ?? cat.tagline_en} ne={cat.description_ne ?? cat.tagline_ne} /></p>
            {kids.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{kids.map((k) => <Link key={k.id} href={`/services/${k.slug}`} className="chip hover:border-primary"><Bi en={k.name_en} ne={k.name_ne} /></Link>)}</div>}
          </div>
          <div className="d-shape-sm border border-line bg-surface p-7">
            <p className="text-sm text-muted"><T k="common.from" /></p>
            <p className="text-5xl font-extralight tracking-tight">{rs(cat.base_price)}<span className="text-lg text-muted">{cat.price_unit === 'hour' ? <> / <T k="common.hour" /></> : <> · <T k="common.fixed" /></>}</span></p>
            <p className="mt-2 text-xs text-muted"><T k="service.min" /> {cat.min_hours} <T k="common.hours" /></p>
            <Link href={`/book?service=${cat.slug}`} className="btn btn-primary btn-lg mt-6 w-full"><T k="nav.book" /></Link>
          </div>
        </div>
      </section>
      <section className="container-x py-14 sm:py-20">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-light tracking-tight sm:text-3xl"><T k="service.choose" /></h2>
          <nav aria-label="Sort" className="flex items-center gap-1 text-sm">
            <span className="mr-1 text-muted"><T k="sort.label" /></span>
            {SORTS.map(([k, label]) => <Link key={k} href={`?sort=${k}`} replace scroll={false} aria-current={key === k} className={cn('rounded-full px-3.5 py-1.5 transition', key === k ? 'bg-fg text-bg' : 'text-muted hover:text-fg')}><T k={label} /></Link>)}
          </nav>
        </div>
        {workers.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {workers.map((w) => <WorkerCard key={w.id} worker={w} categories={cats} rate={w.rate ?? cat.base_price} unit={cat.price_unit} serviceSlug={cat.slug} />)}
          </div>
        ) : (
          <EmptyState title={<T k="service.none.title" />} hint={<T k="service.none.sub" />} action={<Link href="/become-a-worker" className="btn btn-outline"><T k="nav.become_worker" /></Link>} />
        )}
      </section>
    </>
  );
}
