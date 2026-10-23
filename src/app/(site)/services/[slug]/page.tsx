import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getCategories, getCategoryBySlug, getWorkersForCategory, type WorkerSort } from '@/lib/queries';
import { Bi } from '@/components/Bi';
import { T } from '@/components/T';
import { Icon } from '@/components/Icon';
import { WorkerCard } from '@/components/WorkerCard';
import { EmptyState } from '@/components/ui';
import { cn, rs } from '@/lib/utils';
import { ServiceGuidelinesView } from '@/components/services/ServiceGuidelinesView';
import { getServiceImage } from '@/lib/serviceImages';

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
  const img = getServiceImage(slug);
  return (
    <>
      <section className="hero-lines border-b border-line">
        <div className="container-x py-10 sm:py-16">
          {/* Breadcrumb back link */}
          <Link
            href="/services"
            className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span><Bi en="All Services" ne="सबै सेवाहरू" /></span>
          </Link>

          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Column (7 cols): Title, descriptions, service features, action card */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Icon name={cat.icon} className="h-3.5 w-3.5" />
                  <Bi en="Certified Service" ne="प्रमाणित सेवा" />
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-ok" />
                  <Bi en="Verified Background" ne="पृष्ठभूमि प्रमाणीकरण" />
                </span>
              </div>

              <div>
                <h1 className="text-balance text-4xl font-light tracking-tight sm:text-5xl text-fg">
                  <Bi en={cat.name_en} ne={cat.name_ne} />
                </h1>
                {cat.name_ne && (
                  <p data-l="en" lang="ne" className="font-ne mt-2 text-2xl font-bold text-primary">
                    {cat.name_ne}
                  </p>
                )}
              </div>

              <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-muted">
                <Bi en={cat.description_en ?? cat.tagline_en} ne={cat.description_ne ?? cat.tagline_ne} />
              </p>

              {kids.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {kids.map((k) => (
                    <Link key={k.id} href={`/services/${k.slug}`} className="chip hover:border-primary">
                      <Bi en={k.name_en} ne={k.name_ne} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Mobile-only image preview right before action box */}
              {img && (
                <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-2xl border border-line/80 lg:hidden">
                  <Image
                    src={img}
                    alt={cat.name_en}
                    fill
                    priority
                    sizes="90vw"
                    className="object-cover object-center"
                  />
                </div>
              )}

              {/* Direct Home Service Action Card */}
              <div className="rounded-2xl border border-line bg-surface/90 p-6 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-fg">
                      <Bi en="Direct Home Service" ne="प्रत्यक्ष घरमै सेवा" />
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-muted max-w-md">
                      <Bi
                        en="Book your preferred date and time. Our administration team contacts you promptly to confirm all details."
                        ne="आफ्नो उपयुक्त समय छान्नुहोस्। हाम्रो टोलीले सम्पर्क गरी सबै विवरण पुष्टि गर्नेछ।"
                      />
                    </p>
                  </div>
                  <Link href={`/book?service=${cat.slug}`} className="btn btn-primary btn-lg shrink-0 w-full sm:w-auto">
                    <T k="nav.book" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Desktop Photo Showcase */}
            {img && (
              <div className="hidden lg:col-span-5 lg:flex lg:justify-end">
                <div className="relative aspect-square w-full max-w-[440px] overflow-hidden rounded-3xl border border-line bg-surface">
                  <Image
                    src={img}
                    alt={cat.name_en}
                    fill
                    priority
                    sizes="(min-width:1280px) 440px, 380px"
                    className="object-cover object-center"
                  />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/15 bg-black/80 px-3.5 py-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-white">
                      <Icon name={cat.icon} className="h-4 w-4 text-primary" />
                      <span>{cat.name_en}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-white/80">
                      Daksha Sewa
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>


      {/* Service Scope & Customer Guidelines: What's Included and Not Included */}
      <section className="border-b border-line bg-bg/50 py-14 sm:py-20">
        <div className="container-x">
          <ServiceGuidelinesView slug={cat.slug} variant="detail" />
          <div className="mt-8 flex justify-end">
            <Link href={`/book?service=${cat.slug}`} className="btn btn-primary btn-lg">
              <T k="nav.book" />
            </Link>
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
