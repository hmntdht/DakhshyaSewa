import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getCategories } from '@/lib/queries';
import { Bi } from '@/components/Bi';
import { T } from '@/components/T';
import { Icon } from '@/components/Icon';
import { PageTitle } from '@/components/ui';
import { rs } from '@/lib/utils';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Services', description: 'Cleaning, kitchen help, birthday decoration and tuition in Dhangadhi.' };

export default async function ServicesPage() {
  const cats = await getCategories();
  const roots = cats.filter((c) => !c.parent_id);
  return (
    <div className="container-x py-14 sm:py-20">
      <PageTitle title={<T k="services.title" />} sub={<T k="services.sub" />} />
      <div className="grid gap-5 md:grid-cols-2">
        {roots.map((c) => {
          const kids = cats.filter((k) => k.parent_id === c.id);
          return (
            <article key={c.id} className="card group relative flex flex-col p-7 transition hover:border-primary/60 sm:p-9">
              <div className="flex items-start justify-between">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary"><Icon name={c.icon} className="h-6 w-6" /></span>
                <ArrowUpRight className="h-6 w-6 text-muted transition group-hover:text-primary" aria-hidden />
              </div>
              <h2 className="mt-7 text-3xl font-light tracking-tight"><Link href={`/services/${c.slug}`} className="after:absolute after:inset-0"><Bi en={c.name_en} ne={c.name_ne} /></Link></h2>
              {c.name_ne && <p data-l="en" lang="ne" className="font-ne mt-1 font-bold text-primary">{c.name_ne}</p>}
              <p className="mt-3 text-muted"><Bi en={c.description_en ?? c.tagline_en} ne={c.description_ne ?? c.tagline_ne} /></p>
              {kids.length > 0 && <div className="relative z-10 mt-4 flex flex-wrap gap-2">{kids.map((k) => <Link key={k.id} href={`/services/${k.slug}`} className="chip hover:border-primary hover:text-fg"><Bi en={k.name_en} ne={k.name_ne} /></Link>)}</div>}
              <p className="mt-auto pt-8 text-sm"><span className="text-muted"><T k="common.from" /> </span><b className="text-xl font-semibold">{rs(c.base_price)}</b>{c.price_unit === 'hour' ? <span className="text-muted"> / <T k="common.hour" /></span> : <span className="text-muted"> · <T k="common.fixed" /></span>}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
