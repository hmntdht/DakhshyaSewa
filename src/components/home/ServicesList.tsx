import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getCategories } from '@/lib/queries';
import { Bi } from '../Bi';
import { T } from '../T';
import { Icon } from '../Icon';
import { SectionHead } from './SectionHead';
import { rs } from '@/lib/utils';

/** A menu, not a card grid: big names, price on the right, whole row is the link. */
export async function ServicesList() {
  const cats = await getCategories();
  return (
    <section id="services" className="container-x py-20 sm:py-28">
      <SectionHead title={<T k="home.services.title" />} sub={<T k="home.services.sub" />} action={<Link href="/services" className="btn btn-outline"><T k="home.services.all" /></Link>} />
      <ul className="border-t border-line">
        {cats.map((c) => (
          <li key={c.id} className="border-b border-line">
            <Link href={`/services/${c.slug}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-1 py-6 transition hover:bg-surface sm:grid-cols-[auto_1.4fr_1fr_auto] sm:gap-x-8 sm:px-5 sm:py-8">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-line text-primary transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-fg sm:h-14 sm:w-14"><Icon name={c.icon} className="h-5 w-5 sm:h-6 sm:w-6" /></span>
              <span className="min-w-0">
                <span className="block text-2xl font-light leading-tight tracking-tight sm:text-4xl"><Bi en={c.name_en} ne={c.name_ne} /></span>
                {c.name_ne && <span data-l="en" lang="ne" className="font-ne mt-1 hidden text-sm font-bold text-primary sm:block">{c.name_ne}</span>}
              </span>
              <span className="col-span-3 col-start-1 row-start-2 text-sm text-muted sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:text-base"><Bi en={c.tagline_en} ne={c.tagline_ne} /></span>
              <span className="flex items-center gap-4 sm:gap-6">
                <span className="text-right text-sm leading-tight"><span className="block text-xs text-muted"><T k="common.from" /></span><span className="text-lg font-semibold sm:text-xl">{rs(c.base_price)}</span>{c.price_unit === 'hour' && <span className="block text-xs text-muted">/ <T k="common.hour" /></span>}</span>
                <ArrowUpRight className="h-6 w-6 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
