import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { getCategories } from '@/lib/queries';
import { Bi } from '../Bi';
import { T } from '../T';
import { Icon } from '../Icon';
import { SectionHead } from './SectionHead';
import { getServiceImage } from '@/lib/serviceImages';

/**
 * Premium Service Catalog Showcase for Homepage.
 * Displays all verified home services with authentic photography,
 * Lucide icon badges, and transparent pricing.
 */
export async function ServicesList() {
  const cats = await getCategories();
  const roots = cats.filter((c) => !c.parent_id);

  return (
    <section id="services" className="container-x py-20 sm:py-28">
      <SectionHead
        title={<T k="home.services.title" />}
        sub={<T k="home.services.sub" />}
        action={
          <Link href="/services" className="btn btn-outline">
            <T k="home.services.all" />
          </Link>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {roots.map((c) => {
          const img = getServiceImage(c.slug);
          return (
            <article
              key={c.id}
              className="card group relative flex flex-col overflow-hidden border border-line bg-surface transition-colors duration-200 hover:border-primary/60"
            >
              {/* Photo Showcase — authentic square photo without distorting crops */}
              <div className="relative aspect-square w-full overflow-hidden bg-surface/50 border-b border-line/60">
                {img ? (
                  <>
                    <Image
                      src={img}
                      alt={c.name_en}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 95vw"
                      className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    {/* Top Floating Lucide Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/75 px-3 py-1 text-xs font-medium text-white shadow-md">
                      <Icon name={c.icon} className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-semibold tracking-wide">
                        <Bi en="Verified" ne="प्रमाणित" />
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center bg-primary/5">
                    <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
                      <Icon name={c.icon} className="h-8 w-8" />
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col gap-3 p-6">
                <div>
                  <h3 className="text-xl font-semibold leading-tight tracking-tight text-fg transition-colors group-hover:text-primary">
                    <Link href={`/services/${c.slug}`} className="after:absolute after:inset-0">
                      <Bi en={c.name_en} ne={c.name_ne} />
                    </Link>
                  </h3>

                  {c.name_ne && (
                    <p data-l="en" lang="ne" className="font-ne mt-1 text-sm font-bold text-primary">
                      {c.name_ne}
                    </p>
                  )}
                </div>

                <p className="flex-1 text-sm leading-relaxed text-muted line-clamp-2">
                  <Bi en={c.tagline_en ?? c.description_en} ne={c.tagline_ne ?? c.description_ne} />
                </p>

                <div className="flex items-center justify-between border-t border-line/60 pt-3 text-xs font-semibold text-primary">
                  <span>
                    <Bi en="View Details & Book" ne="विवरण हेर्नुहोस् र बुक गर्नुहोस्" />
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

