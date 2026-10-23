import Image from 'next/image';
import Link from 'next/link';
import { Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { getSiteConfig } from '@/lib/config';
import { Bi } from '../Bi';
import { T } from '../T';
import { telHref } from '@/lib/utils';

/**
 * Premium Hero Section — Daksha Sewa.
 * Features an expansive 3/4 width image stage with a subtle zoom,
 * high-contrast bilingual typography, and clean trust badges.
 */
export async function Hero() {
  const { hero: h, contact } = await getSiteConfig();
  const heroImg = '/brand/images/herosection.png';

  return (
    <section data-theme="dark" className="hero-lines relative overflow-hidden bg-bg text-fg">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-10 top-10 h-[42rem] w-[42rem] rounded-full bg-primary/10 blur-[130px]"
      />

      <div className="relative flex min-h-[560px] sm:min-h-[620px] lg:min-h-[680px] xl:min-h-[720px] items-center">
        {/* Right-side 3/4 Screen Width Image Stage (Desktop) */}
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 hidden w-[75vw] select-none lg:block">
          <div className="relative h-full w-full">
            <Image
              src={heroImg}
              alt="Daksha Sewa skilled verified home professionals in Dhangadhi, Nepal"
              fill
              priority
              sizes="75vw"
              className="object-contain object-right"
            />
            {/* Soft gradient mask on the left so text has zero interference */}
            <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
          </div>

          {/* Floating Live Arrival Badge */}
          <div className="pointer-events-auto absolute bottom-6 right-8 xl:right-16 flex items-center gap-3 rounded-2xl border border-line bg-elev/95 px-4 py-2.5 shadow-2xl shadow-black/70 backdrop-blur">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-ok" />
              <span className="relative h-3 w-3 rounded-full bg-ok" />
            </span>
            <div className="text-xs sm:text-sm leading-tight">
              <p className="font-medium text-fg">
                <T k="hero.live_title" />
              </p>
              <p className="text-[11px] sm:text-xs text-muted">
                <T k="hero.live_sub" />
              </p>
            </div>
          </div>
        </div>

        {/* Text Column on the Left Side */}
        <div className="container-x relative z-10 w-full py-14 sm:py-20 lg:py-24">
          <div className="max-w-xl lg:max-w-[48%] xl:max-w-[44%]">
            {/* Eyebrow */}
            <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs sm:text-[13px] text-muted shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" />
                <span className="relative h-2 w-2 rounded-full bg-primary" />
              </span>
              <Bi en={h.eyebrow_en} ne={h.eyebrow_ne} />
            </p>

            {/* High-impact bilingual headline */}
            <h1 className="mt-6 text-balance">
              <span className="block text-[clamp(2.5rem,5.2vw,4.8rem)] font-extralight leading-[1.03] tracking-[-0.03em] text-fg">
                {h.title_en}
              </span>
              <span
                lang="ne"
                className="font-ne mt-2.5 block text-[clamp(2.2rem,4.6vw,4.2rem)] font-extrabold leading-[1.12] text-primary"
              >
                {h.title_ne}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-xl text-pretty text-base sm:text-lg leading-relaxed text-muted">
              <Bi en={h.subtitle_en} ne={h.subtitle_ne} />
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link href="/book" className="btn btn-primary btn-lg shadow-lg shadow-primary/20">
                <Bi en={h.cta_primary_en} ne={h.cta_primary_ne} />
              </Link>
              <Link href="#how" className="btn btn-outline btn-lg">
                <Bi en={h.cta_secondary_en} ne={h.cta_secondary_ne} />
              </Link>
            </div>

            {/* Direct Phone Link */}
            {contact.phone_primary && (
              <a
                href={telHref(contact.phone_primary)}
                className="mt-7 inline-flex items-center gap-3 text-xs sm:text-sm text-muted transition hover:text-fg"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface">
                  <Phone className="h-4 w-4 text-primary" />
                </span>
                <span>
                  <T k="hero.call" /> <b className="font-semibold text-fg">{contact.phone_primary}</b>
                </span>
              </a>
            )}
          </div>

          {/* Mobile Image Stage (<1024px) */}
          <div className="mt-10 lg:hidden">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-line bg-surface">
              <Image
                src={heroImg}
                alt="Daksha Sewa skilled verified home professionals in Dhangadhi, Nepal"
                fill
                priority
                sizes="95vw"
                className="object-cover object-center"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2.5 rounded-xl border border-line bg-elev/95 px-3 py-2 shadow-xl backdrop-blur">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-ok" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-ok" />
                </span>
                <div className="text-xs leading-tight">
                  <p className="font-medium text-fg">
                    <T k="hero.live_title" />
                  </p>
                  <p className="text-[10px] text-muted">
                    <T k="hero.live_sub" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

