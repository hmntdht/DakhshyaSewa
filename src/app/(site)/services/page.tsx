import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { getCategories } from '@/lib/queries';
import { Bi } from '@/components/Bi';
import { T } from '@/components/T';
import { Icon } from '@/components/Icon';
import { PageTitle } from '@/components/ui';
import { getServiceImage } from '@/lib/serviceImages';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Services',
  description: 'Verified cleaning, kitchen help, birthday decoration, tuition, elder and child care in Dhangadhi, Nepal.',
};

export default async function ServicesPage() {
  const cats = await getCategories();
  const roots = cats.filter((c) => !c.parent_id);

  return (
    <div className="container-x py-14 sm:py-20">
      <PageTitle title={<T k="services.title" />} sub={<T k="services.sub" />} />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {roots.map((c) => {
          const img = getServiceImage(c.slug);
          return (
            <article
              key={c.id}
              className="card group relative flex flex-col overflow-hidden border border-line bg-surface transition-colors duration-200 hover:border-primary/60"
            >
              {/* Photo Showcase — authentic square aspect ratio matching the 1254x1254 source */}
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
                    {/* Floating Lucide badge on photo */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/85 px-3 py-1 text-xs font-medium text-white">
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

              {/* Card body */}
              <div className="flex flex-1 flex-col gap-3.5 p-6">
                <div>
                  <h2 className="text-xl font-semibold leading-tight tracking-tight text-fg transition-colors group-hover:text-primary">
                    <Link href={`/services/${c.slug}`} className="after:absolute after:inset-0">
                      <Bi en={c.name_en} ne={c.name_ne} />
                    </Link>
                  </h2>

                  {c.name_ne && (
                    <p data-l="en" lang="ne" className="font-ne mt-1 text-sm font-bold text-primary">
                      {c.name_ne}
                    </p>
                  )}
                </div>

                <p className="flex-1 text-sm leading-relaxed text-muted line-clamp-3">
                  <Bi en={c.description_en ?? c.tagline_en} ne={c.description_ne ?? c.tagline_ne} />
                </p>

                <div className="flex items-center justify-between border-t border-line/60 pt-3.5 text-xs font-semibold text-primary">
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
    </div>
  );
}

